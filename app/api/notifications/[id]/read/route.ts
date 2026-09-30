import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { id } = await params;
  await prisma.notification.updateMany({
    where: { id, userId: s.id },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true, data: { id } });
}
