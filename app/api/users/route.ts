import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ROLES = ['admin', 'pegawai', 'petugas_ruangan'];

const publicSelect = { id: true, name: true, username: true, role: true, isActive: true, createdAt: true };

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get('role');

  // Ada query role -> semua peran boleh, untuk dropdown (tanpa password)
  if (roleFilter) {
    const items = await prisma.user.findMany({
      where: { role: roleFilter, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ ok: true, data: items });
  }

  // Tanpa query role -> hanya admin, semua user tanpa password
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });
  const items = await prisma.user.findMany({ select: publicSelect, orderBy: { name: 'asc' } });
  return NextResponse.json({ ok: true, data: items });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    username?: string;
    password?: string;
    role?: string;
  };

  const name = body.name?.trim();
  const username = body.username?.trim();
  if (!name || !username) {
    return NextResponse.json({ ok: false, error: 'Nama dan username wajib diisi' }, { status: 400 });
  }
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password minimal 8 karakter' }, { status: 400 });
  }
  if (!body.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: 'Peran tidak valid' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ ok: false, error: 'Username sudah dipakai' }, { status: 409 });

  const user = await prisma.user.create({
    data: { name, username, password: await hash(body.password, 10), role: body.role },
    select: publicSelect,
  });

  await logAudit(s.id, 'user.create', 'user', username);

  return NextResponse.json({ ok: true, data: user }, { status: 201 });
}
