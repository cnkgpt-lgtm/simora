import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateBookingInput } from '@/lib/booking';
import { notify, notifyRole } from '@/lib/notify';
import { logAudit } from '@/lib/audit';

// POST /api/bookings/[id]/review — persetujuan/penolakan oleh admin
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya admin yang dapat meninjau pemesanan' }, { status: 403 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  const decision = body.decision;
  if (decision !== 'disetujui' && decision !== 'ditolak') {
    return NextResponse.json({ ok: false, error: 'Keputusan tidak valid' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { code: true, name: true } } },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: 'Pemesanan tidak ditemukan' }, { status: 404 });
  }
  if (booking.status !== 'menunggu') {
    return NextResponse.json({ ok: false, error: 'Pemesanan sudah ditinjau' }, { status: 400 });
  }

  const note = (body.note ?? '').trim();
  if (decision === 'ditolak' && !note) {
    return NextResponse.json({ ok: false, error: 'Alasan penolakan wajib diisi' }, { status: 400 });
  }

  // Validasi ulang sebelum menyetujui: cegah bentrok yang masuk belakangan.
  if (decision === 'disetujui') {
    const v = await validateBookingInput({
      roomId: booking.roomId,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      participants: booking.participants,
      excludeId: id,
    });
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: decision,
      reviewerId: s.id,
      reviewedAt: new Date(),
      reviewNote: note || null,
    },
  });

  const jadwal = `${booking.room.code} — ${booking.room.name} ${booking.date} ${booking.startTime}-${booking.endTime}`;
  if (decision === 'disetujui') {
    await notify(
      booking.requesterId,
      'persetujuan',
      'Pemesanan disetujui',
      `"${booking.title}" — ${jadwal}${note ? `. Catatan: ${note}` : ''}`,
    );
    await notifyRole(
      'petugas_ruangan',
      'jadwal',
      'Jadwal persiapan ruangan',
      `"${booking.title}" — ${jadwal}`,
    );
  } else {
    await notify(
      booking.requesterId,
      'penolakan',
      'Pemesanan ditolak',
      `"${booking.title}" — ${jadwal}. Alasan: ${note}`,
    );
  }
  await logAudit(s.id, 'booking.review', 'booking', `${decision} ${id}`);

  return NextResponse.json({ ok: true, data: updated });
}
