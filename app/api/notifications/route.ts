import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get('unread') === '1';

  const items = await prisma.notification.findMany({
    where: { userId: s.id, ...(onlyUnread ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = onlyUnread
    ? items.length
    : await prisma.notification.count({ where: { userId: s.id, isRead: false } });

  return NextResponse.json({ ok: true, data: { items, unread } });
}
