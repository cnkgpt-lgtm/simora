'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { makassarToday, formatTanggalJam } from '@/lib/time';
import { Card, PageHeader, Badge, Stat, EmptyState, inputCls, btnPrimary, btnSecondary } from '@/components/ui';

interface RoomOpt {
  id: string;
  code: string;
  name: string;
}

interface RoomUsage {
  roomId: string;
  code: string;
  name: string;
  capacity: number;
  totalDisetujui: number;
  selesai: number;
  berlangsung: number;
  terjadwal: number;
  terlambat: number;
  melewatiWaktu: number;
  totalMenit: number;
}

interface UsageReportData {
  period: { from: string; to: string };
  generatedAt: string;
  overall: {
    totalRapat: number;
    totalSelesai: number;
    totalBerlangsung: number;
    totalTerlambat: number;
    totalMelewatiWaktu: number;
    byStatus: { menunggu: number; disetujui: number; ditolak: number; dibatalkan: number };
  };
  perRoom: RoomUsage[];
}

async function loadRoomOptions(): Promise<RoomOpt[]> {
  try {
    const d = await api<RoomOpt[] | { items: RoomOpt[] }>('/api/rooms?active=1');
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.items)) return d.items;
    return [];
  } catch {
    return [];
  }
}

function defaultFrom(): string {
  return `${makassarToday().slice(0, 7)}-01`;
}

export default function LaporanPage() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(makassarToday());
  const [roomId, setRoomId] = useState('');
  // Filter yang benar-benar diterapkan ke query
  const [qFrom, setQFrom] = useState(defaultFrom());
  const [qTo, setQTo] = useState(makassarToday());
  const [qRoomId, setQRoomId] = useState('');

  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [report, setReport] = useState<UsageReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRoomOptions().then(setRooms);
  }, []);

  const loadReport = useCallback(async (f: string, t: string, r: string) => {
    try {
      const params = new URLSearchParams({ from: f, to: t });
      if (r) params.set('roomId', r);
      const data = await api<UsageReportData>(`/api/reports/usage?${params.toString()}`);
      setReport(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat awal + auto-refresh 30 detik
  useEffect(() => {
    loadReport(qFrom, qTo, qRoomId);
    const timer = setInterval(() => loadReport(qFrom, qTo, qRoomId), 30000);
    return () => clearInterval(timer);
  }, [qFrom, qTo, qRoomId, loadReport]);

  function apply() {
    setLoading(true);
    setQFrom(from);
    setQTo(to);
    setQRoomId(roomId);
  }

  const maxMenit = useMemo(
    () => Math.max(0, ...(report?.perRoom.map((r) => r.totalMenit) ?? [])),
    [report],
  );

  function exportUrl(format: 'xlsx' | 'pdf'): string {
    const params = new URLSearchParams({ format, from: qFrom, to: qTo });
    if (qRoomId) params.set('roomId', qRoomId);
    return `/api/reports/usage/export?${params.toString()}`;
  }

  const o = report?.overall;

  return (
    <div>
      <PageHeader
        title="Laporan Penggunaan Ruangan"
        subtitle="Rekapitulasi operasional rapat per ruangan"
        actions={
          <>
            <a href={exportUrl('xlsx')} className={btnSecondary}>
              Ekspor Excel
            </a>
            <a href={exportUrl('pdf')} className={btnPrimary}>
              Ekspor PDF
            </a>
          </>
        }
      />

      {/* Filter */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Dari tanggal</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sampai tanggal</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ruangan</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="">Semua ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={apply} className={btnPrimary} type="button">
            Terapkan
          </button>
        </div>
      </Card>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading && !report ? (
        <p className="p-8 text-center text-sm text-gray-500">Memuat laporan…</p>
      ) : !report ? (
        <EmptyState title="Laporan tidak tersedia" />
      ) : (
        <>
          {/* Ringkasan */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat label="Total Rapat" value={o?.totalRapat ?? 0} />
            <Stat label="Selesai" value={o?.totalSelesai ?? 0} />
            <Stat label="Berlangsung" value={o?.totalBerlangsung ?? 0} />
            <Stat label="Terlambat" value={o?.totalTerlambat ?? 0} />
            <Stat label="Melewati Waktu" value={o?.totalMelewatiWaktu ?? 0} />
          </div>

          {/* Live preview 3D */}
          <h2 className="mb-3 text-base font-bold text-gray-900">Live Preview Penggunaan Ruangan</h2>
          {report.perRoom.length === 0 ? (
            <EmptyState
              title="Belum ada data pada periode ini"
              hint="Ubah rentang tanggal atau pilih ruangan lain."
            />
          ) : (
            <div className="p3d mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {report.perRoom.map((r) => {
                const util = maxMenit > 0 ? Math.round((r.totalMenit / maxMenit) * 100) : 0;
                return (
                  <div
                    key={r.roomId}
                    className="card-3d preserve-3d rounded-xl border border-gray-200 bg-white p-5 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.code}</p>
                      </div>
                      <Badge tone={r.berlangsung > 0 ? 'green' : 'gray'}>
                        {r.berlangsung > 0 ? 'Berlangsung' : 'Terjadwal'}
                      </Badge>
                    </div>
                    <p className="mt-3 text-4xl font-extrabold text-gray-900">{r.totalDisetujui}</p>
                    <p className="text-xs text-gray-500">total rapat disetujui</p>
                    <p className="mt-2 text-sm text-gray-700">
                      Selesai {r.selesai} &bull; Berlangsung {r.berlangsung}
                    </p>
                    <p className="text-sm text-gray-700">
                      Terjadwal {r.terjadwal} &bull; Terlambat {r.terlambat}
                    </p>
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      Total {(r.totalMenit / 60).toFixed(1)} jam
                    </p>
                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${util}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">Utilisasi relatif {util}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tabel rincian */}
          <h2 className="mb-3 text-base font-bold text-gray-900">Rincian per Ruangan</h2>
          <Card className="mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Kode</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Nama</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Kapasitas</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Disetujui</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Selesai</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Berlangsung</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Terjadwal</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Terlambat</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Melewati Waktu</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Total (jam)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.perRoom.map((r) => (
                    <tr key={r.roomId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.code}</td>
                      <td className="px-4 py-3 text-gray-700">{r.name}</td>
                      <td className="px-4 py-3 text-gray-700">{r.capacity}</td>
                      <td className="px-4 py-3 text-gray-700">{r.totalDisetujui}</td>
                      <td className="px-4 py-3 text-gray-700">{r.selesai}</td>
                      <td className="px-4 py-3 text-gray-700">{r.berlangsung}</td>
                      <td className="px-4 py-3 text-gray-700">{r.terjadwal}</td>
                      <td className="px-4 py-3 text-gray-700">{r.terlambat}</td>
                      <td className="px-4 py-3 text-gray-700">{r.melewatiWaktu}</td>
                      <td className="px-4 py-3 text-gray-700">{(r.totalMenit / 60).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-gray-500">
            Status operasional termasuk Selesai; seluruh waktu WITA.
            {report.generatedAt && (
              <> Laporan dibuat {formatTanggalJam(report.generatedAt)} WITA.</>
            )}
          </p>
        </>
      )}
    </div>
  );
}
