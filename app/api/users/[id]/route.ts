import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ROLES = ['admin', 'pegawai', 'petugas_ruangan'];

const publicSelect = { id: true, name: true, username: true, role: true, isActive: true, createdAt: true };

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  };

  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ ok: false, error: 'Pengguna tidak ditemukan' }, { status: 404 });

  // Dilarang menonaktifkan akun sendiri
  if (body.isActive === false && id === s.id) {
    return NextResponse.json({ ok: false, error: 'Tidak dapat menonaktifkan akun sendiri' }, { status: 400 });
  }
  if (body.role !== undefined && !ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: 'Peran tidak valid' }, { status: 400 });
  }
  if (body.password !== undefined && body.password !== '' && body.password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password minimal 8 karakter' }, { status: 400 });
  }

  const data: { name?: string; role?: string; isActive?: boolean; password?: string } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ ok: false, error: 'Nama tidak boleh kosong' }, { status: 400 });
    data.name = name;
  }
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.password) data.password = await hash(body.password, 10);

  const user = await prisma.user.update({ where: { id }, data, select: publicSelect });

  await logAudit(s.id, 'user.update', 'user', id);

  return NextResponse.json({ ok: true, data: user });
}
