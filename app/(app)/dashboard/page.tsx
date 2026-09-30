'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { makassarToday, addDays, formatTanggal, formatJam, formatTanggalJam } from '@/lib/time';
import {
  Card,
  PageHeader,
  Badge,
  Stat,
  EmptyState,
  btnSecondary,
  inputCls,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/components/ui';

interface NextMeetingInfo {
  id: string;
  title: string;
  roomName: string;
  startTime: string;
}

interface OverviewSummary {
  total: number;
  berlangsung: number;
  selesai: number;
  berikutnya: NextMeetingInfo | null;
}

interface TimelineItem {
  id: string;
  title: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: number;
  requesterName: string;
  op: string;
  terlambat: boolean;
  terlambatMenit: number;
  melewatiWaktu: boolean;
  startsAt: string;
  endsAt: string;
}

interface RoomStatusItem {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status: string;
  currentTitle: string | null;
}

interface OverviewData {
  date: string;
  now: string;
  summary: OverviewSummary;
  timeline: TimelineItem[];
  rooms: RoomStatusItem[];
}

const POLL_MS = 15000;

export default function DashboardPage() {
  const [date, setDate] = useState<string>(makassarToday());
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (silent: boolean) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await api<OverviewData>(`/api/overview?date=${date}`);
        setData(res);
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : 'Gagal memuat data');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [date],
  );

  // Ambil peran pengguna sekali (untuk tombol "Tandai Selesai" khusus admin).
  useEffect(() => {
    api<{ role: string }>('/api/auth/me')
      .then((me) => setRole(me.role))
      .catch(() => setRole(null));
  }, []);

  // Fetch saat tanggal berubah + polling tiap 15 detik.
  useEffect(() => {
    fetchOverview(false);
    const timer = setInterval(() => fetchOverview(true), POLL_MS);
    return () => clearInterval(timer);
  }, [fetchOverview]);

  const finishMeeting = async (id: string) => {
    if (!window.confirm('Tandai rapat ini sebagai selesai?')) return;
    setFinishingId(id);
    try {
      await api(`/api/bookings/${id}/finish`, { method: 'POST' });
      await fetchOverview(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menandai selesai');
    } finally {
      setFinishingId(null);
    }
  };

  const goToday = () => setDate(makassarToday());

  const summary = data?.summary;
  const timeline = data?.timeline ?? [];
  const rooms = data?.rooms ?? [];
  const isAdmin = role === 'admin';

  return (
    <div>
      <PageHeader
        title="Dashboard Monitoring"
        subtitle={`${formatTanggal(data?.date ?? date)} • WITA`}
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => setDate((d) => addDays(d, -1))}>
              ‹ Kemarin
            </button>
            <button type="button" className={btnSecondary} onClick={goToday}>
              Hari ini
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDate((d) => addDays(d, 1))}>
              Besok ›
            </button>
            <input
              type="date"
              className={inputCls}
              style={{ width: 'auto' }}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </>
        }
      />

      {data?.now && (
        <p className="mb-4 text-xs text-gray-500">
          Diperbarui otomatis • data per {formatTanggalJam(data.now)} WITA
        </p>
      )}

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Rapat" value={loading && !summary ? '…' : summary?.total ?? 0} />
        <Stat label="Berlangsung" value={loading && !summary ? '…' : summary?.berlangsung ?? 0} />
        <Stat label="Selesai" value={loading && !summary ? '…' : summary?.selesai ?? 0} />
        <Stat
          label="Rapat Berikutnya"
          value={
            loading && !summary ? (
              '…'
            ) : summary?.berikutnya ? (
              <span className="line-clamp-1 text-lg leading-8">{summary.berikutnya.title}</span>
            ) : (
              '-'
            )
          }
          sub={summary?.berikutnya ? `${summary.berikutnya.startTime} • ${summary.berikutnya.roomName}` : undefined}
        />
      </div>

      {/* Jadwal rapat */}
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Jadwal Rapat</h2>
        {loading && timeline.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Memuat jadwal…</p>
        ) : timeline.length === 0 ? (
          <EmptyState title="Belum ada jadwal rapat pada tanggal ini" />
        ) : (
          <ul className="divide-y divide-gray-100">
            {timeline.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 py-3 sm:gap-3">
                <div className="w-28 shrink-0 text-sm font-medium text-gray-900">
                  {formatJam(t.startsAt)} – {formatJam(t.endsAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Pemohon: {t.requesterName} • {t.participants} peserta
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="gray">{t.roomCode}</Badge>
                  <Badge tone={STATUS_TONE[t.op] ?? 'gray'}>{STATUS_LABEL[t.op] ?? t.op}</Badge>
                  {t.terlambat && <Badge tone="red">Terlambat {t.terlambatMenit} mnt</Badge>}
                  {t.melewatiWaktu && <Badge tone="amber">Melewati waktu</Badge>}
                  {isAdmin && t.op === 'berlangsung' && (
                    <button
                      type="button"
                      className={btnSecondary}
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                      disabled={finishingId === t.id}
                      onClick={() => finishMeeting(t.id)}
                    >
                      {finishingId === t.id ? 'Menyimpan…' : 'Tandai Selesai'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Status ruangan */}
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Status Ruangan</h2>
        {rooms.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">Belum ada data ruangan.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {r.code} • Kapasitas {r.capacity} orang
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] ?? 'gray'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                </div>
                {r.currentTitle && (
                  <p className="mt-2 truncate text-xs text-gray-600">
                    Berlangsung: <span className="font-medium">{r.currentTitle}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
