import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { notify, notifyRole } from '@/lib/notify';
import { makassarToday, formatJam, minutesBetween } from '@/lib/time';
import { opStatus, isTerlambat, isMelewatiWaktu } from '@/lib/meeting';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/overview?date=YYYY-MM-DD
 * Dashboard monitoring: ringkasan + timeline rapat + status ruangan (WITA).
 * Semua peran yang sudah login boleh mengakses.
 * Efek samping (idempoten): auto-start rapat yang waktunya tiba & pengingat rapat.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get('date');
  const date = q && DATE_RE.test(q) ? q : makassarToday();

  const now = new Date();
  const settings = await getSettings();

  // --- AUTO-START (idempoten, untuk semua tanggal) ---
  // Booking disetujui yang waktunya sudah tiba dan belum selesai -> mulai otomatis.
  const toStart = await prisma.booking.findMany({
    where: {
      status: 'disetujui',
      actualStart: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    include: { room: true },
  });
  for (const b of toStart) {
    await prisma.booking.update({ where: { id: b.id }, data: { actualStart: now } });
    const lateMinutes = minutesBetween(b.startsAt, now);
    if (lateMinutes > settings.lateToleranceMinutes) {
      await notifyRole(
        'admin',
        'peringatan',
        'Rapat terlambat dimulai',
        `"${b.title}" di ${b.room.name} terlambat ${lateMinutes} menit`,
      );
    }
  }

  // --- PENGINGAT rapat yang akan dimulai ---
  const reminderLimit = new Date(now.getTime() + settings.reminderMinutes * 60000);
  const dueReminders = await prisma.booking.findMany({
    where: {
      status: 'disetujui',
      reminderSent: false,
      startsAt: { gt: now, lte: reminderLimit },
    },
    include: { room: true },
  });
  for (const b of dueReminders) {
    await notify(
      b.requesterId,
      'pengingat',
      'Pengingat rapat',
      `"${b.title}" dimulai pukul ${formatJam(b.startsAt)} di ${b.room.name}`,
    );
    await prisma.booking.update({ where: { id: b.id }, data: { reminderSent: true } });
  }

  // --- TIMELINE rapat pada tanggal `date` ---
  const bookings = await prisma.booking.findMany({
    where: { date },
    include: { room: true, requester: true },
    orderBy: { startTime: 'asc' },
  });

  const timeline = bookings.map((b) => {
    const op = opStatus(b, now);
    return {
      id: b.id,
      title: b.title,
      roomId: b.roomId,
      roomCode: b.room.code,
      roomName: b.room.name,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      participants: b.participants,
      requesterName: b.requester.name,
      op,
      terlambat: isTerlambat(b, settings.lateToleranceMinutes),
      terlambatMenit: b.actualStart ? minutesBetween(b.startsAt, b.actualStart) : 0,
      melewatiWaktu: isMelewatiWaktu(b, now),
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
    };
  });

  const nextItem = timeline.find((t) => t.op === 'terjadwal' && new Date(t.startsAt) > now);
  const summary = {
    total: timeline.length,
    berlangsung: timeline.filter((t) => t.op === 'berlangsung').length,
    selesai: timeline.filter((t) => t.op === 'selesai').length,
    berikutnya: nextItem
      ? {
          id: nextItem.id,
          title: nextItem.title,
          roomName: nextItem.roomName,
          startTime: nextItem.startTime,
        }
      : null,
  };

  // --- STATUS RUANGAN ---
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  });
  const activeMaintenances = await prisma.maintenance.findMany({
    where: {
      status: { not: 'selesai' },
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: { roomId: true },
  });
  const maintenanceRoomIds = new Set(activeMaintenances.map((m) => m.roomId));
  const ongoingByRoom = new Map<string, string>();
  for (const t of timeline) {
    if (t.op === 'berlangsung') ongoingByRoom.set(t.roomId, t.title);
  }
  const roomData = rooms.map((r) => {
    const status =
      r.status === 'pemeliharaan' || maintenanceRoomIds.has(r.id)
        ? 'pemeliharaan'
        : ongoingByRoom.has(r.id)
          ? 'digunakan'
          : 'tersedia';
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      capacity: r.capacity,
      status,
      currentTitle: ongoingByRoom.get(r.id) ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    data: {
      date,
      now: now.toISOString(),
      summary,
      timeline,
      rooms: roomData,
    },
  });
}
