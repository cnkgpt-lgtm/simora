// Validasi input pemesanan rapat — SERVER ONLY (jangan dipakai langsung tanpa validasi ulang).
import { prisma } from './prisma';
import { makassarToday, makassarToUtc } from './time';

export interface BookingInput {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  excludeId?: string;
}

export type BookingValidation =
  | { ok: true; startsAt: Date; endsAt: Date }
  | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Cek tanggal kalender yang nyata (mis. 2026-02-30 ditolak), bukan sekadar format. */
function isRealDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === day;
}

export async function validateBookingInput(input: BookingInput): Promise<BookingValidation> {
  const { roomId, date, startTime, endTime, participants } = input;

  const room = roomId ? await prisma.room.findUnique({ where: { id: roomId } }) : null;
  if (!room || !room.isActive || room.status === 'pemeliharaan') {
    return { ok: false, error: 'Ruangan tidak tersedia / dalam pemeliharaan' };
  }

  if (!Number.isFinite(participants) || !Number.isInteger(participants) || participants < 1) {
    return { ok: false, error: 'Jumlah peserta minimal 1 orang' };
  }
  if (participants > room.capacity) {
    return { ok: false, error: `Jumlah peserta melebihi kapasitas ruangan (${room.capacity} orang)` };
  }

  if (!isRealDate(date)) {
    return { ok: false, error: 'Format tanggal tidak valid (YYYY-MM-DD)' };
  }
  if (date < makassarToday()) {
    return { ok: false, error: 'Tanggal tidak boleh di masa lalu' };
  }

  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    return { ok: false, error: 'Format jam tidak valid (HH:mm)' };
  }
  if (startTime >= endTime) {
    return { ok: false, error: 'Jam selesai harus lebih besar dari jam mulai' };
  }

  const startsAt = makassarToUtc(date, startTime);
  const endsAt = makassarToUtc(date, endTime);

  // Bentrok: ada booking lain di ruangan yang sama (status menunggu/disetujui),
  // kecuali excludeId, dengan waktu yang tumpang tindih.
  const bentrok = await prisma.booking.findFirst({
    where: {
      roomId,
      status: { in: ['menunggu', 'disetujui'] },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      NOT: { OR: [{ endsAt: { lte: startsAt } }, { startsAt: { gte: endsAt } }] },
    },
    select: { id: true },
  });
  if (bentrok) {
    return { ok: false, error: 'Jadwal bentrok dengan pemesanan lain di ruangan ini' };
  }

  // Overlap pemeliharaan: maintenance aktif yang rentang tanggalnya mencakup date.
  const maintenance = await prisma.maintenance.findFirst({
    where: {
      roomId,
      status: { not: 'selesai' },
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: { id: true },
  });
  if (maintenance) {
    return { ok: false, error: 'Ruangan dalam pemeliharaan pada tanggal tersebut' };
  }

  return { ok: true, startsAt, endsAt };
}
