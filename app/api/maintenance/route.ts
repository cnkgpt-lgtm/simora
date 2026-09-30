import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const MANAGE_ROLES = ['admin', 'petugas_ruangan'];
const STATUS_OK = ['dijadwalkan', 'berlangsung', 'selesai'];

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const status = searchParams.get('status');

  const items = await prisma.maintenance.findMany({
    where: { ...(roomId ? { roomId } : {}), ...(status ? { status } : {}) },
    include: {
      room: { select: { code: true, name: true } },
      pic: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json({ ok: true, data: items });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (!MANAGE_ROLES.includes(s.role))
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    roomId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    status?: string;
    picId?: string;
    notes?: string;
  };

  const roomId = body.roomId?.trim();
  const description = body.description?.trim();
  if (!roomId || !body.startDate || !body.endDate || !description) {
    return NextResponse.json(
      { ok: false, error: 'Ruangan, tanggal mulai, tanggal selesai, dan deskripsi wajib diisi' },
      { status: 400 },
    );
  }
  if (body.endDate < body.startDate) {
    return NextResponse.json(
      { ok: false, error: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai' },
      { status: 400 },
    );
  }
  const status = body.status && STATUS_OK.includes(body.status) ? body.status : 'dijadwalkan';

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return NextResponse.json({ ok: false, error: 'Ruangan tidak ditemukan' }, { status: 404 });
  if (body.picId) {
    const pic = await prisma.user.findUnique({ where: { id: body.picId } });
    if (!pic) return NextResponse.json({ ok: false, error: 'Penanggung jawab tidak ditemukan' }, { status: 400 });
  }

  const item = await prisma.maintenance.create({
    data: {
      roomId,
      startDate: body.startDate,
      endDate: body.endDate,
      description,
      status,
      picId: body.picId || null,
      notes: body.notes?.trim() || null,
    },
    include: {
      room: { select: { code: true, name: true } },
      pic: { select: { id: true, name: true } },
    },
  });

  await logAudit(s.id, 'maintenance.create', 'maintenance', description.slice(0, 120));

  return NextResponse.json({ ok: true, data: item }, { status: 201 });
}
