import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const CONDITIONS = ['baik', 'rusak ringan', 'rusak berat'];
const STATUSES = ['tersedia', 'digunakan', 'pemeliharaan'];

/** GET /api/rooms — semua peran boleh. Filter: q, status, active. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const status = (searchParams.get('status') || '').trim();
  const active = searchParams.get('active');

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { building: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status) where.status = status;
  if (active === '1') where.isActive = true;
  else if (active === '0') where.isActive = false;

  const rooms = await prisma.room.findMany({ where, orderBy: { name: 'asc' } });
  return NextResponse.json({ ok: true, data: rooms });
}

/** POST /api/rooms — hanya admin. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin')
    return NextResponse.json({ ok: false, error: 'Hanya admin yang dapat menambah ruangan' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body permintaan tidak valid' }, { status: 400 });
  }

  const code = String(body.code || '').trim();
  const name = String(body.name || '').trim();
  const capacity = Number(body.capacity);

  if (!code) return NextResponse.json({ ok: false, error: 'Kode ruangan wajib diisi' }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: 'Nama ruangan wajib diisi' }, { status: 400 });
  if (!Number.isInteger(capacity) || capacity <= 0)
    return NextResponse.json({ ok: false, error: 'Kapasitas harus berupa angka bulat lebih dari 0' }, { status: 400 });

  const condition = String(body.condition || 'baik').trim();
  if (!CONDITIONS.includes(condition))
    return NextResponse.json({ ok: false, error: 'Kondisi tidak valid' }, { status: 400 });

  const status = String(body.status || 'tersedia').trim();
  if (!STATUSES.includes(status))
    return NextResponse.json({ ok: false, error: 'Status tidak valid' }, { status: 400 });

  const existing = await prisma.room.findUnique({ where: { code } });
  if (existing)
    return NextResponse.json({ ok: false, error: 'Kode ruangan sudah digunakan' }, { status: 400 });

  const room = await prisma.room.create({
    data: {
      code,
      name,
      type: String(body.type || 'Ruang Rapat').trim(),
      building: String(body.building || '').trim(),
      floor: String(body.floor || '').trim(),
      location: String(body.location || '').trim(),
      capacity,
      facilities: String(body.facilities || '').trim(),
      pic: String(body.pic || '').trim(),
      condition,
      status,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });

  await logAudit(s.id, 'room.create', 'room', code);
  return NextResponse.json({ ok: true, data: room }, { status: 201 });
}
