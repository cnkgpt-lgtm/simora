import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const CONDITIONS = ['baik', 'rusak ringan', 'rusak berat'];
const STATUSES = ['tersedia', 'digunakan', 'pemeliharaan'];

function needAdmin(role: string | undefined) {
  if (role !== 'admin')
    return NextResponse.json({ ok: false, error: 'Hanya admin yang dapat mengubah ruangan' }, { status: 403 });
  return null;
}

/** PUT /api/rooms/[id] — hanya admin, update parsial. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  const denied = needAdmin(s.role);
  if (denied) return denied;

  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ ok: false, error: 'Ruangan tidak ditemukan' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body permintaan tidak valid' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.code !== undefined) {
    const code = String(body.code).trim();
    if (!code) return NextResponse.json({ ok: false, error: 'Kode ruangan wajib diisi' }, { status: 400 });
    if (code !== room.code) {
      const clash = await prisma.room.findUnique({ where: { code } });
      if (clash)
        return NextResponse.json({ ok: false, error: 'Kode ruangan sudah digunakan' }, { status: 400 });
    }
    data.code = code;
  }
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ ok: false, error: 'Nama ruangan wajib diisi' }, { status: 400 });
    data.name = name;
  }
  if (body.capacity !== undefined) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0)
      return NextResponse.json({ ok: false, error: 'Kapasitas harus berupa angka bulat lebih dari 0' }, { status: 400 });
    data.capacity = capacity;
  }
  if (body.condition !== undefined) {
    const condition = String(body.condition).trim();
    if (!CONDITIONS.includes(condition))
      return NextResponse.json({ ok: false, error: 'Kondisi tidak valid' }, { status: 400 });
    data.condition = condition;
  }
  if (body.status !== undefined) {
    const status = String(body.status).trim();
    if (!STATUSES.includes(status))
      return NextResponse.json({ ok: false, error: 'Status tidak valid' }, { status: 400 });
    data.status = status;
  }
  for (const key of ['type', 'building', 'floor', 'location', 'facilities', 'pic'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key]).trim();
  }
  if (body.isActive !== undefined) data.isActive = body.isActive === true;
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;

  const updated = await prisma.room.update({ where: { id }, data });
  await logAudit(s.id, 'room.update', 'room', updated.code);
  return NextResponse.json({ ok: true, data: updated });
}

/** DELETE /api/rooms/[id] — hanya admin. Tolak bila ada booking menunggu/disetujui. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  const denied = needAdmin(s.role);
  if (denied) return denied;

  const { id } = await params;
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) return NextResponse.json({ ok: false, error: 'Ruangan tidak ditemukan' }, { status: 404 });

  const blocked = await prisma.booking.count({
    where: { roomId: id, status: { in: ['menunggu', 'disetujui'] } },
  });
  if (blocked > 0)
    return NextResponse.json(
      {
        ok: false,
        error: `Ruangan tidak dapat dihapus karena masih memiliki ${blocked} pemesanan yang menunggu/disetujui`,
      },
      { status: 400 },
    );

  await prisma.room.delete({ where: { id } });
  await logAudit(s.id, 'room.delete', 'room', room.code);
  return NextResponse.json({ ok: true, data: { id } });
}
