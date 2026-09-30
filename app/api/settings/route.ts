import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings';
import { logAudit } from '@/lib/audit';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  return NextResponse.json({ ok: true, data: await getSettings() });
}

function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin') return NextResponse.json({ ok: false, error: 'Akses ditolak' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // timezone sengaja diabaikan: dikunci ke Asia/Makassar
  await saveSettings({
    lateToleranceMinutes: toNum(body.lateToleranceMinutes),
    reminderMinutes: toNum(body.reminderMinutes),
    cancellationHours: toNum(body.cancellationHours),
  });

  await logAudit(s.id, 'settings.update', 'setting', '');

  return NextResponse.json({ ok: true, data: await getSettings() });
}
