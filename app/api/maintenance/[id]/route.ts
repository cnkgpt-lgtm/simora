import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const MANAGE_ROLES = ['admin', 'petugas_ruangan'];
const STATUS_OK = ['dijadwalkan', 'berlangsung', 'selesai'];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (!MANAGE_ROLES.includes(s.role))
    return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    roomId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    status?: string;
    picId?: string | null;
    notes?: string | null;
  };

  const current = await prisma.maintenance.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ ok: false, error: 'Data tidak ditemukan' }, { status: 404 });

  const startDate = body.startDate ?? current.startDate;
  const endDate = body.endDate ?? current.endDate;
  if (endDate < startDate) {
    return NextResponse.json(
      { ok: false, error: 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai' },
      { status: 400 },
    );
  }
  if (body.status !== undefined && !STATUS_OK.includes(body.status)) {
    return NextResponse.json({ ok: false, error: 'Status tidak valid' }, { status: 400 });
  }
  if (body.roomId) {
    const room = await prisma.room.findUnique({ where: { id: body.roomId } });
    if (!room) return NextResponse.json({ ok: false, error: 'Ruangan tidak ditemukan' }, { status: 404 });
  }
  if (body.picId) {
    const pic = await prisma.user.findUnique({ where: { id: body.picId } });
    if (!pic) return NextResponse.json({ ok: false, error: 'Penanggung jawab tidak ditemukan' }, { status: 400 });
  }

  const data: {
    roomId?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    status?: string;
    picId?: string | null;
    notes?: string | null;
  } = {};
  if (body.roomId !== undefined) data.roomId = body.roomId;
  if (body.startDate !== undefined) data.startDate = body.startDate;
  if (body.endDate !== undefined) data.endDate = body.endDate;
  if (body.description !== undefined) data.description = body.description.trim();
  if (body.status !== undefined) data.status = body.status;
  if (body.picId !== undefined) data.picId = body.picId || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;

  const item = await prisma.maintenance.update({
    where: { id },
    data,
    include: {
      room: { select: { code: true, name: true } },
      pic: { select: { id: true, name: true } },
    },
  });

  await logAudit(s.id, 'maintenance.update', 'maintenance', id);

  return NextResponse.json({ ok: true, data: item });
}
