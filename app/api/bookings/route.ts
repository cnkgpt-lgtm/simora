import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateBookingInput } from '@/lib/booking';
import { notifyRole } from '@/lib/notify';
import { logAudit } from '@/lib/audit';

const BOOKING_INCLUDE = {
  room: { select: { id: true, code: true, name: true } },
  requester: { select: { id: true, name: true } },
} as const;

/** Filter where untuk Booking (struktural; kompatibel dengan Prisma.BookingWhereInput). */
interface BookingWhere {
  requesterId?: string;
  status?: string;
  roomId?: string;
  date?: { gte?: string; lte?: string };
}

const STATUS_FILTER = ['menunggu', 'disetujui', 'ditolak', 'dibatalkan'];

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const q = new URL(req.url).searchParams;
  const where: BookingWhere = {};
  if (s.role === 'pegawai') where.requesterId = s.id;
  const status = q.get('status') ?? '';
  if (STATUS_FILTER.includes(status)) where.status = status;
  const roomId = q.get('roomId') ?? '';
  if (roomId) where.roomId = roomId;
  const from = q.get('from') ?? '';
  const to = q.get('to') ?? '';
  if (from || to) {
    where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  const data = await prisma.booking.findMany({
    where,
    include: BOOKING_INCLUDE,
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  });
  return NextResponse.json({ ok: true, data });
}

interface CreateBody {
  roomId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  purpose?: string;
  participants?: number | string;
  notes?: string;
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const roomId = body.roomId ?? '';
  const date = body.date ?? '';
  const startTime = body.startTime ?? '';
  const endTime = body.endTime ?? '';
  const title = (body.title ?? '').trim();

  if (!roomId || !date || !startTime || !endTime) {
    return NextResponse.json({ ok: false, error: 'Data pemesanan tidak lengkap' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ ok: false, error: 'Judul rapat wajib diisi' }, { status: 400 });
  }
  const participants = Number(body.participants);

  const v = await validateBookingInput({ roomId, date, startTime, endTime, participants });
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });

  const created = await prisma.booking.create({
    data: {
      roomId,
      requesterId: s.id,
      date,
      startTime,
      endTime,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      title,
      purpose: (body.purpose ?? '').trim() || null,
      participants: Math.floor(participants),
      notes: (body.notes ?? '').trim() || null,
      status: 'menunggu',
    },
    include: BOOKING_INCLUDE,
  });

  const roomLabel = `${created.room.code} — ${created.room.name}`;
  await notifyRole(
    'admin',
    'pengajuan_baru',
    'Pengajuan pemesanan baru',
    `"${title}" oleh ${s.name} — ${roomLabel} ${date} ${startTime}-${endTime}`,
  );
  await logAudit(s.id, 'booking.create', 'booking', title);

  return NextResponse.json({ ok: true, data: created }, { status: 201 });
}
