import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { getSession } from '@/lib/auth';
import { makassarToday, formatTanggal, formatTanggalJam } from '@/lib/time';
import { getUsageReport, type UsageReport } from '../_logic';

async function buildXlsx(report: UsageReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const o = report.overall;

  // --- Sheet 1: Ringkasan ---
  const sum = wb.addWorksheet('Ringkasan');
  sum.columns = [{ width: 26 }, { width: 40 }];
  sum.addRow(['Ringkasan', 'Nilai']);
  sum.addRow(['Periode', `${formatTanggal(report.period.from)} – ${formatTanggal(report.period.to)}`]);
  sum.addRow(['Dibuat pada', `${formatTanggalJam(report.generatedAt)} WITA`]);
  sum.addRow(['Total Rapat', o.totalRapat]);
  sum.addRow(['Selesai', o.totalSelesai]);
  sum.addRow(['Berlangsung', o.totalBerlangsung]);
  sum.addRow(['Terlambat', o.totalTerlambat]);
  sum.addRow(['Melewati Waktu', o.totalMelewatiWaktu]);
  sum.addRow(['Menunggu', o.byStatus.menunggu]);
  sum.addRow(['Disetujui', o.byStatus.disetujui]);
  sum.addRow(['Ditolak', o.byStatus.ditolak]);
  sum.addRow(['Dibatalkan', o.byStatus.dibatalkan]);
  sum.getRow(1).font = { bold: true };

  // --- Sheet 2: Penggunaan Ruangan ---
  const det = wb.addWorksheet('Penggunaan Ruangan');
  det.columns = [
    { width: 12 },
    { width: 32 },
    { width: 12 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
  ];
  det.addRow([
    'Kode',
    'Nama',
    'Kapasitas',
    'Disetujui',
    'Selesai',
    'Berlangsung',
    'Terjadwal',
    'Terlambat',
    'Melewati Waktu',
    'Total Menit',
  ]);
  det.getRow(1).font = { bold: true };
  for (const r of report.perRoom) {
    det.addRow([
      r.code,
      r.name,
      r.capacity,
      r.totalDisetujui,
      r.selesai,
      r.berlangsung,
      r.terjadwal,
      r.terlambat,
      r.melewatiWaktu,
      r.totalMenit,
    ]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as unknown as ArrayBuffer);
}

function buildPdf(report: UsageReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const o = report.overall;

    doc.font('Helvetica-Bold').fontSize(16).text('Laporan Penggunaan Ruangan', { align: 'center' });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Periode: ${formatTanggal(report.period.from)} - ${formatTanggal(report.period.to)}`);
    doc.text(`Dibuat: ${formatTanggalJam(report.generatedAt)} WITA`);
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text('Ringkasan');
    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Rapat: ${o.totalRapat}    Selesai: ${o.totalSelesai}    Berlangsung: ${o.totalBerlangsung}`);
    doc.text(`Terlambat: ${o.totalTerlambat}    Melewati Waktu: ${o.totalMelewatiWaktu}`);
    doc.text(
      `Menunggu: ${o.byStatus.menunggu}    Disetujui: ${o.byStatus.disetujui}    ` +
        `Ditolak: ${o.byStatus.ditolak}    Dibatalkan: ${o.byStatus.dibatalkan}`,
    );
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(12).text('Penggunaan per Ruangan');
    doc.font('Helvetica').fontSize(10);
    if (report.perRoom.length === 0) {
      doc.moveDown(0.5);
      doc.text('Belum ada data pada periode ini.');
    }
    for (const r of report.perRoom) {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`${r.name} (${r.code}) - kapasitas ${r.capacity}`);
      doc.font('Helvetica').text(
        `Disetujui ${r.totalDisetujui} | Selesai ${r.selesai} | Berlangsung ${r.berlangsung} | ` +
          `Terjadwal ${r.terjadwal} | Terlambat ${r.terlambat} | Melewati waktu ${r.melewatiWaktu} | ` +
          `Total ${(r.totalMenit / 60).toFixed(1)} jam`,
      );
    }
    doc.end();
  });
}

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Belum login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
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
  if (format !== 'xlsx' && format !== 'pdf') {
    return NextResponse.json({ ok: false, error: 'Format harus xlsx atau pdf' }, { status: 400 });
  }

  const report = await getUsageReport(from, to, roomId);
  const filename = `laporan-penggunaan-${from}-${to}`;

  if (format === 'xlsx') {
    const buf = await buildXlsx(report);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  const buf = await buildPdf(report);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  });
}
