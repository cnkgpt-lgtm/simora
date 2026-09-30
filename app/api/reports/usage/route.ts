import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { makassarToday } from '@/lib/time';
import { getUsageReport } from './_logic';

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const today = makassarToday();
  const to = searchParams.get('to') || today;
  const from = searchParams.get('from') || `${today.slice(0, 7)}-01`;
  const roomId = searchParams.get('roomId') || undefined;

  if (from > to) {
    return NextResponse.json(
      { ok: false, error: 'Tanggal awal tidak boleh melebihi tanggal akhir' },
      { status: 400 },
    );
  }

  const report = await getUsageReport(from, to, roomId);
  return NextResponse.json({ ok: true, data: report });
}
