import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ ok: true, data: { initialized: count > 0 } });
}

export async function POST(req: Request) {
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ ok: false, error: 'Admin sudah diaktivasi' }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const { name, username, password } = body as { name?: string; username?: string; password?: string };
  const lateToleranceMinutes = Math.max(0, Math.min(180, Number(body.lateToleranceMinutes) || 10));
  const reminderMinutes = Math.max(0, Math.min(10080, Number(body.reminderMinutes) || 30));
  const cancellationHours = Math.max(0, Math.min(720, Number(body.cancellationHours) || 2));

  if (!name || !username || !password || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'Nama, username, dan password (min. 8 karakter) wajib diisi' },
      { status: 400 },
    );
  }

  const user = await prisma.user.create({
    data: { name, username, password: await hashPassword(password), role: 'admin' },
  });
  await prisma.setting.createMany({
    data: [
      { key: 'lateToleranceMinutes', value: String(lateToleranceMinutes) },
      { key: 'reminderMinutes', value: String(reminderMinutes) },
      { key: 'cancellationHours', value: String(cancellationHours) },
      { key: 'timezone', value: 'Asia/Makassar' },
    ],
  });
  await logAudit(user.id, 'bootstrap', 'user', `Aktivasi admin pertama: ${username}`);
  return NextResponse.json({ ok: true, data: { id: user.id } });
}
