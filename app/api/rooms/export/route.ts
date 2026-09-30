import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const HEADERS = [
  'Kode',
  'Nama',
  'Jenis',
  'Gedung',
  'Lantai',
  'Lokasi',
  'Kapasitas',
  'Fasilitas',
  'Penanggung Jawab',
  'Kondisi',
  'Status',
  'Aktif',
  'Catatan',
];

/** Escape satu sel CSV: gandakan tanda kutip, bungkus dengan kutip dua. */
function cell(value: string | number | boolean | null | undefined): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

/** GET /api/rooms/export — hanya admin. Unduh CSV master ruangan. */
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });
  if (s.role !== 'admin')
    return NextResponse.json({ ok: false, error: 'Hanya admin yang dapat mengekspor data' }, { status: 403 });

  const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });

  const lines: string[] = [HEADERS.map(cell).join(';')];
  for (const r of rooms) {
    lines.push(
      [
        cell(r.code),
        cell(r.name),
        cell(r.type),
        cell(r.building),
        cell(r.floor),
        cell(r.location),
        cell(r.capacity),
        cell(r.facilities),
        cell(r.pic),
        cell(r.condition),
        cell(r.status),
        cell(r.isActive ? 'Ya' : 'Tidak'),
        cell(r.notes),
      ].join(';'),
    );
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="master-ruangan.csv"',
    },
  });
}
