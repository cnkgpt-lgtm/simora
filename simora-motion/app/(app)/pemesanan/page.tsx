'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { makassarToday, formatTanggal, formatJam } from '@/lib/time';
import { opStatus, type OpStatus } from '@/lib/meeting';
import {
  Card,
  PageHeader,
  Badge,
  EmptyState,
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/components/ui';

interface Me {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface RoomOpt {
  id: string;
  code: string;
  name: string;
  capacity: number;
}

interface BookingItem {
  id: string;
  title: string;
  purpose: string | null;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  endsAt: string;
  participants: number;
  actualStart: string | null;
  actualEnd: string | null;
  reviewNote: string | null;
  requesterId: string;
  room: { id: string; code: string; name: string };
  requester: { id: string; name: string };
}

interface BookingForm {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  participants: string;
  purpose: string;
  notes: string;
}

interface ReviewState {
  id: string;
  title: string;
  decision: 'disetujui' | 'ditolak';
}

const EMPTY_FORM: BookingForm = {
  roomId: '',
  date: '',
  startTime: '',
  endTime: '',
  title: '',
  participants: '1',
  purpose: '',
  notes: '',
};

const STATUS_OPTIONS = ['', 'menunggu', 'disetujui', 'ditolak', 'dibatalkan'];

export default function PemesananPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [list, setList] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [fStatus, setFStatus] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BookingForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [review, setReview] = useState<ReviewState | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isAdmin = me?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (fStatus) q.set('status', fStatus);
      if (fFrom) q.set('from', fFrom);
      if (fTo) q.set('to', fTo);
      const qs = q.toString();
      const data = await api<BookingItem[]>(qs ? `/api/bookings?${qs}` : '/api/bookings');
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data pemesanan');
    } finally {
      setLoading(false);
    }
  }, [fStatus, fFrom, fTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const setF =
    (k: keyof BookingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function openModal() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
    setRoomsLoading(true);
    try {
      const data = await api<RoomOpt[]>('/api/rooms?active=1');
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = Number(form.participants);
    if (!Number.isInteger(n) || n < 1) {
      setFormError('Jumlah peserta minimal 1 orang');
      return;
    }
    if (!form.roomId) {
      setFormError('Ruangan wajib dipilih');
      return;
    }
    setSaving(true);
    try {
      await api<BookingItem>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: form.roomId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          title: form.title.trim(),
          purpose: form.purpose.trim() || undefined,
          participants: n,
          notes: form.notes.trim() || undefined,
        }),
      });
      setShowModal(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan pemesanan');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(b: BookingItem) {
    if (!confirm(`Batalkan pemesanan "${b.title}"?`)) return;
    setActionId(b.id);
    setError(null);
    try {
      await api<BookingItem>(`/api/bookings/${b.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'dibatalkan' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal membatalkan pemesanan');
    } finally {
      setActionId(null);
    }
  }

  function openReview(b: BookingItem, decision: 'disetujui' | 'ditolak') {
    setReview({ id: b.id, title: b.title, decision });
    setReviewNote('');
    setReviewError(null);
  }

  async function submitReview() {
    if (!review) return;
    const note = reviewNote.trim();
    if (review.decision === 'ditolak' && !note) {
      setReviewError('Alasan penolakan wajib diisi');
      return;
    }
    setReviewError(null);
    setActionId(review.id);
    try {
      await api<BookingItem>(`/api/bookings/${review.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision: review.decision, note: note || undefined }),
      });
      setReview(null);
      setReviewNote('');
      await load();
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Gagal memproses peninjauan');
    } finally {
      setActionId(null);
    }
  }

  async function handleFinish(b: BookingItem) {
    if (!confirm(`Tandai rapat "${b.title}" sebagai selesai?`)) return;
    setActionId(b.id);
    setError(null);
    try {
      await api<BookingItem>(`/api/bookings/${b.id}/finish`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menandai rapat selesai');
    } finally {
      setActionId(null);
    }
  }

  const roomsEmpty = !roomsLoading && rooms.length === 0;

  return (
    <div>
      <PageHeader
        title="Pemesanan"
        subtitle="Kelola pengajuan pemesanan rapat"
        actions={
          <button type="button" className={btnPrimary} onClick={openModal}>
            Ajukan Pemesanan
          </button>
        }
      />

      {/* Filter */}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
            <select className={inputCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              {STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v === '' ? 'Semua status' : (STATUS_LABEL[v] ?? v)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Dari tanggal</label>
            <input type="date" className={inputCls} value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Sampai tanggal</label>
            <input type="date" className={inputCls} value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Memuat data…</p>
      ) : list.length === 0 ? (
        <EmptyState
          title="Belum ada pemesanan"
          hint="Ajukan pemesanan rapat baru untuk memulai."
          action={
            <button type="button" className={btnPrimary} onClick={openModal}>
              Ajukan Pemesanan
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const op: OpStatus = opStatus(b);
            const busy = actionId === b.id;
            const canCancel =
              (b.status === 'menunggu' || b.status === 'disetujui') && (isAdmin || b.requesterId === me?.id);
            const canReview = isAdmin && b.status === 'menunggu';
            const canFinish = isAdmin && op === 'berlangsung';
            return (
              <Card key={b.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone={STATUS_TONE[b.status] ?? 'gray'}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
                      <Badge tone={STATUS_TONE[op] ?? 'gray'}>{STATUS_LABEL[op] ?? op}</Badge>
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <dt className="text-xs text-gray-500">Ruangan</dt>
                    <dd className="font-medium text-gray-900">
                      {b.room.code} — {b.room.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Tanggal</dt>
                    <dd className="text-gray-900">{formatTanggal(b.startsAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Jam</dt>
                    <dd className="text-gray-900">
                      {formatJam(b.startsAt)} – {formatJam(b.endsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Peserta</dt>
                    <dd className="text-gray-900">{b.participants} orang</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Pemohon</dt>
                    <dd className="text-gray-900">{b.requester.name}</dd>
                  </div>
                </dl>
                {b.purpose && (
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Tujuan:</span> {b.purpose}
                  </p>
                )}
                {b.status === 'ditolak' && b.reviewNote && (
                  <p className="mt-2 text-sm text-red-700">
                    <span className="font-medium">Alasan penolakan:</span> {b.reviewNote}
                  </p>
                )}
                {(canCancel || canReview || canFinish) && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {canCancel && (
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy}
                        onClick={() => handleCancel(b)}
                      >
                        {busy ? 'Memproses…' : 'Batalkan'}
                      </button>
                    )}
                    {canReview && (
                      <>
                        <button
                          type="button"
                          className={btnPrimary}
                          disabled={busy}
                          onClick={() => openReview(b, 'disetujui')}
                        >
                          {busy ? 'Memproses…' : 'Setujui'}
                        </button>
                        <button
                          type="button"
                          className={btnDanger}
                          disabled={busy}
                          onClick={() => openReview(b, 'ditolak')}
                        >
                          {busy ? 'Memproses…' : 'Tolak'}
                        </button>
                      </>
                    )}
                    {canFinish && (
                      <button
                        type="button"
                        className={btnSecondary}
                        disabled={busy}
                        onClick={() => handleFinish(b)}
                      >
                        {busy ? 'Memproses…' : 'Tandai Selesai'}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal pengajuan */}
      {showModal && (
        <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="modal-enter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900">Ajukan Pemesanan Rapat</h2>
            <form onSubmit={submitCreate} className="mt-4 space-y-3">
              {roomsEmpty && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Belum ada ruangan — input dulu di menu Ruangan.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Ruangan *</label>
                <select className={inputCls} value={form.roomId} onChange={setF('roomId')} required>
                  <option value="">{roomsLoading ? 'Memuat ruangan…' : '— Pilih ruangan —'}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name} (kap. {r.capacity ?? 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Tanggal *</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.date}
                    min={makassarToday()}
                    onChange={setF('date')}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Mulai *</label>
                  <input type="time" className={inputCls} value={form.startTime} onChange={setF('startTime')} required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Selesai *</label>
                  <input type="time" className={inputCls} value={form.endTime} onChange={setF('endTime')} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Judul rapat *</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.title}
                  onChange={setF('title')}
                  placeholder="cth. Rapat Koordinasi Bulanan"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Jumlah peserta *</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.participants}
                  onChange={setF('participants')}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Tujuan</label>
                <textarea className={inputCls} rows={2} value={form.purpose} onChange={setF('purpose')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Catatan</label>
                <textarea className={inputCls} rows={2} value={form.notes} onChange={setF('notes')} />
              </div>
              {formError && <p className="text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button type="submit" className={btnPrimary} disabled={saving || roomsEmpty}>
                  {saving ? 'Menyimpan…' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tinjauan admin */}
      {review && (
        <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="modal-enter w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900">
              {review.decision === 'disetujui' ? 'Setujui Pemesanan' : 'Tolak Pemesanan'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">“{review.title}”</p>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {review.decision === 'ditolak' ? 'Alasan penolakan *' : 'Catatan (opsional)'}
              </label>
              <textarea
                className={inputCls}
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  review.decision === 'ditolak' ? 'Wajib diisi — disampaikan ke pemohon' : 'cth. Pastikan ruangan siap 15 menit sebelumnya'
                }
              />
            </div>
            {reviewError && <p className="mt-2 text-sm text-red-700">{reviewError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setReview(null)}
                disabled={actionId !== null}
              >
                Batal
              </button>
              <button
                type="button"
                className={review.decision === 'disetujui' ? btnPrimary : btnDanger}
                onClick={submitReview}
                disabled={actionId !== null}
              >
                {actionId !== null
                  ? 'Memproses…'
                  : review.decision === 'disetujui'
                    ? 'Ya, Setujui'
                    : 'Ya, Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
