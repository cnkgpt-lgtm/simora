import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { opStatus } from '@/lib/meeting';
import { notify } from '@/lib/notify';
import { logAudit } from '@/lib/audit';

// POST /api/bookings/[id]/finish — tandai rapat selesai (admin, hanya saat berlangsung)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Hanya admin yang dapat menandai rapat selesai' }, { status: 403 });
  }
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { room: { select: { code: true, name: true } } },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: 'Pemesanan tidak ditemukan' }, { status: 404 });
  }
  if (opStatus(booking) !== 'berlangsung') {
    return NextResponse.json({ ok: false, error: 'Hanya rapat yang sedang berlangsung yang dapat diselesaikan' }, { status: 400 });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { actualEnd: new Date() },
  });

  await notify(
    booking.requesterId,
    'selesai',
    'Rapat selesai',
    `"${booking.title}" — ${booking.room.code} — ${booking.room.name} ${booking.date} ${booking.startTime}-${booking.endTime} telah selesai.`,
  );
  await logAudit(s.id, 'booking.finish', 'booking', id);

  return NextResponse.json({ ok: true, data: updated });
}
