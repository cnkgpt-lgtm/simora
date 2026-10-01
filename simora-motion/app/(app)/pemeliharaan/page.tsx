'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTanggal, makassarToday } from '@/lib/time';
import {
  Card,
  PageHeader,
  Badge,
  EmptyState,
  inputCls,
  btnPrimary,
  btnSecondary,
  STATUS_LABEL,
  STATUS_TONE,
} from '@/components/ui';

interface Me {
  role: string;
}

interface MaintItem {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  description: string;
  status: string;
  picId: string | null;
  notes: string | null;
  room: { code: string; name: string };
  pic: { id: string; name: string } | null;
}

interface RoomOpt {
  id: string;
  code: string;
  name: string;
}

interface PetugasOpt {
  id: string;
  name: string;
  role: string;
}

const STATUS_LIST = ['dijadwalkan', 'berlangsung', 'selesai'];

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

export default function PemeliharaanPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<MaintItem[]>([]);
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [petugas, setPetugas] = useState<PetugasOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal tambah
  const [showAdd, setShowAdd] = useState(false);
  const [fRoomId, setFRoomId] = useState('');
  const [fStart, setFStart] = useState(makassarToday());
  const [fEnd, setFEnd] = useState(makassarToday());
  const [fDesc, setFDesc] = useState('');
  const [fStatus, setFStatus] = useState('dijadwalkan');
  const [fPicId, setFPicId] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal edit status per baris
  const [editItem, setEditItem] = useState<MaintItem | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);

  const canManage = me?.role === 'admin' || me?.role === 'petugas_ruangan';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meData, list] = await Promise.all([
        api<Me>('/api/auth/me'),
        api<MaintItem[]>(`/api/maintenance${statusFilter ? `?status=${statusFilter}` : ''}`),
      ]);
      setMe(meData);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadRoomOptions().then(setRooms);
    api<PetugasOpt[]>('/api/users?role=petugas_ruangan')
      .then(setPetugas)
      .catch(() => setPetugas([]));
  }, []);

  function openAdd() {
    setFormError('');
    setFRoomId('');
    setFStart(makassarToday());
    setFEnd(makassarToday());
    setFDesc('');
    setFStatus('dijadwalkan');
    setFPicId('');
    setFNotes('');
    setShowAdd(true);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (fEnd < fStart) {
      setFormError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
      return;
    }
    setSaving(true);
    try {
      await api('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          roomId: fRoomId,
          startDate: fStart,
          endDate: fEnd,
          description: fDesc,
          status: fStatus,
          picId: fPicId || null,
          notes: fNotes || null,
        }),
      });
      setShowAdd(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: MaintItem) {
    setEditError('');
    setEditItem(item);
    setEditStatus(item.status);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editItem) return;
    setEditError('');
    setUpdating(true);
    try {
      await api(`/api/maintenance/${editItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: editStatus }),
      });
      setEditItem(null);
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pemeliharaan Ruangan"
        subtitle="Jadwal pemeliharaan dan perbaikan ruangan kampus"
        actions={
          canManage ? (
            <button onClick={openAdd} className={btnPrimary} type="button">
              + Tambah
            </button>
          ) : undefined
        }
      />

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-600">Filter status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputCls} w-auto`}
        >
          <option value="">Semua</option>
          {STATUS_LIST.map((st) => (
            <option key={st} value={st}>
              {STATUS_LABEL[st] ?? st}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">Memuat…</p>
        ) : items.length === 0 ? (
          <EmptyState title="Belum ada data pemeliharaan" hint="Tambahkan jadwal pemeliharaan ruangan baru." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Ruangan</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Periode</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Deskripsi</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Penanggung Jawab</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-500">Catatan</th>
                  {canManage && <th className="px-4 py-2.5 text-left font-medium text-gray-500">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.room.name}</p>
                      <p className="text-xs text-gray-500">{m.room.code}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatTanggal(m.startDate)} – {formatTanggal(m.endDate)}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-gray-700">{m.description}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[m.status] ?? 'gray'}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{m.pic?.name ?? '-'}</td>
                    <td className="max-w-xs px-4 py-3 text-gray-700">{m.notes ?? '-'}</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(m)} className={btnSecondary} type="button">
                          Ubah Status
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal tambah */}
      {showAdd && (
        <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitAdd}
            className="modal-enter max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-4 text-base font-bold text-gray-900">Tambah Pemeliharaan</h2>
            {formError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ruangan</label>
                <select value={fRoomId} onChange={(e) => setFRoomId(e.target.value)} required className={inputCls}>
                  <option value="">-- Pilih ruangan --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal mulai</label>
                  <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} required className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tanggal selesai</label>
                  <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} required className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                  required
                  rows={3}
                  className={inputCls}
                  placeholder="Contoh: Perbaikan AC ruang 3A"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputCls}>
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABEL[st] ?? st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Petugas penanggung jawab</label>
                <select value={fPicId} onChange={(e) => setFPicId(e.target.value)} className={inputCls}>
                  <option value="">-- Tidak ada --</option>
                  {petugas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>
                Batal
              </button>
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal edit status */}
      {editItem && (
        <div className="overlay-enter fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitEdit} className="modal-enter w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-bold text-gray-900">Ubah Status</h2>
            <p className="mb-4 text-sm text-gray-500">
              {editItem.room.name} ({editItem.room.code})
            </p>
            {editError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={inputCls}>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st] ?? st}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditItem(null)} className={btnSecondary}>
                Batal
              </button>
              <button type="submit" disabled={updating} className={btnPrimary}>
                {updating ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
