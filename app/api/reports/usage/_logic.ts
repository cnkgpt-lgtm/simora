import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { opStatus, isTerlambat, isMelewatiWaktu, type MeetingLike } from '@/lib/meeting';
import { minutesBetween } from '@/lib/time';

export interface UsageByStatus {
  menunggu: number;
  disetujui: number;
  ditolak: number;
  dibatalkan: number;
}

export interface UsageOverall {
  totalRapat: number;
  totalSelesai: number;
  totalBerlangsung: number;
  totalTerlambat: number;
  totalMelewatiWaktu: number;
  byStatus: UsageByStatus;
}

export interface UsagePerRoom {
  roomId: string;
  code: string;
  name: string;
  capacity: number;
  totalDisetujui: number;
  selesai: number;
  berlangsung: number;
  terjadwal: number;
  terlambat: number;
  melewatiWaktu: number;
  totalMenit: number;
}

export interface UsageReport {
  period: { from: string; to: string };
  generatedAt: Date;
  overall: UsageOverall;
  perRoom: UsagePerRoom[];
}

function byStatusKey(status: string): keyof UsageByStatus | null {
  if (status === 'menunggu' || status === 'disetujui' || status === 'ditolak' || status === 'dibatalkan') {
    return status;
  }
  return null;
}

/**
 * Laporan penggunaan ruangan untuk periode date >= from && date <= to (YYYY-MM-DD, WITA).
 * Status operasional dihitung via opStatus(); toleransi keterlambatan dari pengaturan.
 * totalMenit = jumlah minutesBetween(startsAt, endsAt) untuk pemesanan berstatus 'disetujui'.
 */
export async function getUsageReport(from: string, to: string, roomId?: string): Promise<UsageReport> {
  const { lateToleranceMinutes } = await getSettings();
  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: { date: { gte: from, lte: to }, ...(roomId ? { roomId } : {}) },
    include: { room: { select: { id: true, code: true, name: true, capacity: true } } },
  });

  const overall: UsageOverall = {
    totalRapat: bookings.length,
    totalSelesai: 0,
    totalBerlangsung: 0,
    totalTerlambat: 0,
    totalMelewatiWaktu: 0,
    byStatus: { menunggu: 0, disetujui: 0, ditolak: 0, dibatalkan: 0 },
  };

  const roomMap = new Map<string, UsagePerRoom>();

  for (const b of bookings) {
    const m: MeetingLike = b;
    const key = byStatusKey(b.status);
    if (key) overall.byStatus[key] += 1;

    const op = opStatus(m, now);
    if (op === 'selesai') overall.totalSelesai += 1;
    if (op === 'berlangsung') overall.totalBerlangsung += 1;
    if (isTerlambat(m, lateToleranceMinutes)) overall.totalTerlambat += 1;
    if (isMelewatiWaktu(m, now)) overall.totalMelewatiWaktu += 1;

    let r = roomMap.get(b.roomId);
    if (!r) {
      r = {
        roomId: b.roomId,
        code: b.room.code,
        name: b.room.name,
        capacity: b.room.capacity,
        totalDisetujui: 0,
        selesai: 0,
        berlangsung: 0,
        terjadwal: 0,
        terlambat: 0,
        melewatiWaktu: 0,
        totalMenit: 0,
      };
      roomMap.set(b.roomId, r);
    }
    if (b.status === 'disetujui') {
      r.totalDisetujui += 1;
      if (op === 'selesai') r.selesai += 1;
      else if (op === 'berlangsung') r.berlangsung += 1;
      else if (op === 'terjadwal') r.terjadwal += 1;
      if (isTerlambat(m, lateToleranceMinutes)) r.terlambat += 1;
      if (isMelewatiWaktu(m, now)) r.melewatiWaktu += 1;
      r.totalMenit += Math.max(0, minutesBetween(b.startsAt, b.endsAt));
    }
  }

  const perRoom = Array.from(roomMap.values()).sort(
    (a, b) => b.totalDisetujui - a.totalDisetujui || a.name.localeCompare(b.name),
  );

  return { period: { from, to }, generatedAt: now, overall, perRoom };
}
