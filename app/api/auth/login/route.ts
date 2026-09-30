import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: Request) {
  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Username dan password wajib diisi' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.password))) {
    return NextResponse.json({ ok: false, error: 'Username atau password salah' }, { status: 401 });
  }
  await createSession({ id: user.id, name: user.name, username: user.username, role: user.role });
  await logAudit(user.id, 'login', 'session', `Login: ${username}`);
  return NextResponse.json({
    ok: true,
    data: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
}
