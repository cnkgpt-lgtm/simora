import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { notifyRole } from '@/lib/notify';
import { logAudit } from '@/lib/audit';

// PUT /api/bookings/[id] — pembatalan pemesanan (body: { status: 'dibatalkan' })
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (body.status !== 'dibatalkan') {
    return NextResponse.json({ ok: false, error: 'Aksi tidak valid' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { code: true, name: true } } },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: 'Pemesanan tidak ditemukan' }, { status: 404 });
  }
  if (booking.status === 'dibatalkan') {
    return NextResponse.json({ ok: false, error: 'Pemesanan sudah dibatalkan' }, { status: 400 });
  }
  if (booking.status !== 'menunggu' && booking.status !== 'disetujui') {
    return NextResponse.json({ ok: false, error: 'Pemesanan tidak dapat dibatalkan' }, { status: 400 });
  }

  if (s.role !== 'admin') {
    if (booking.requesterId !== s.id) {
      return NextResponse.json(
        { ok: false, error: 'Hanya admin atau pemohon yang dapat membatalkan pemesanan ini' },
        { status: 403 },
      );
    }
    const settings = await getSettings();
    const batasBatal = booking.startsAt.getTime() - settings.cancellationHours * 3600_000;
    if (Date.now() >= batasBatal) {
      return NextResponse.json({ ok: false, error: 'Pembatalan melewati batas waktu' }, { status: 400 });
    }
  }

  const updated = await prisma.booking.update({ where: { id }, data: { status: 'dibatalkan' } });

  await notifyRole(
    'admin',
    'pembatalan',
    'Pemesanan dibatalkan',
    `"${booking.title}" — ${booking.room.code} — ${booking.room.name} ${booking.date} ${booking.startTime}-${booking.endTime} dibatalkan oleh ${s.name}`,
  );
  await logAudit(s.id, 'booking.cancel', 'booking', id);

  return NextResponse.json({ ok: true, data: updated });
}
