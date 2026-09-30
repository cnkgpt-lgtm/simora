import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const raw = Number(searchParams.get('limit')) || 100;
  const limit = Math.max(1, Math.min(500, raw));

  const items = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ ok: true, data: items });
}
