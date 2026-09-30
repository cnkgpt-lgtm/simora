'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { api } from '@/lib/api';

interface Room {
  id: string;
  code: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  location: string;
  capacity: number;
  facilities: string;
  pic: string;
  condition: string;
  status: string;
  isActive: boolean;
  notes: string | null;
}

interface Me {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface RoomForm {
  code: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  location: string;
  capacity: string;
  facilities: string;
  pic: string;
  condition: string;
  status: string;
  isActive: boolean;
  notes: string;
}

const EMPTY_FORM: RoomForm = {
  code: '',
  name: '',
  type: 'Ruang Rapat',
  building: '',
  floor: '',
  location: '',
  capacity: '10',
  facilities: '',
  pic: '',
  condition: 'baik',
  status: 'tersedia',
  isActive: true,
  notes: '',
};

const CONDITIONS = ['baik', 'rusak ringan', 'rusak berat'];
const ROOM_STATUSES = ['tersedia', 'digunakan', 'pemeliharaan'];

function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

function locationText(r: Room): string {
  const parts = [r.building ? `Gedung ${r.building}` : '', r.floor ? `Lantai ${r.floor}` : '', r.location].filter(
    Boolean,
  );
  return parts.join(' · ');
}

export default function RuanganPage() {
  const [role, setRole] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (statusFilter) params.set('status', statusFilter);
      const data = await api<Room[]>(`/api/rooms?${params.toString()}`);
      setRooms(data);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then((me) => setRole(me.role))
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setForm({
      code: room.code,
      name: room.name,
      type: room.type,
      building: room.building,
      floor: room.floor,
      location: room.location,
      capacity: String(room.capacity),
      facilities: room.facilities,
      pic: room.pic,
      condition: room.condition,
      status: room.status,
      isActive: room.isActive,
      notes: room.notes ?? '',
    });
    setFormError('');
    setShowModal(true);
  }

  function set<K extends keyof RoomForm>(key: K, value: RoomForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.code.trim()) return setFormError('Kode ruangan wajib diisi');
    if (!form.name.trim()) return setFormError('Nama ruangan wajib diisi');
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0)
      return setFormError('Kapasitas harus berupa angka bulat lebih dari 0');

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        type: form.type.trim() || 'Ruang Rapat',
        building: form.building.trim(),
        floor: form.floor.trim(),
        location: form.location.trim(),
        capacity,
        facilities: form.facilities.trim(),
        pic: form.pic.trim(),
        condition: form.condition,
        status: form.status,
        isActive: form.isActive,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await api(`/api/rooms/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/rooms', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan ruangan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(room: Room) {
    if (!window.confirm(`Hapus ruangan "${room.name}" (${room.code})?`)) return;
    try {
      await api(`/api/rooms/${room.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Gagal menghapus ruangan');
    }
  }

  return (
    <div>
      <PageHeader
        title="Master Ruangan"
        subtitle="Kelola data master ruangan kampus yang menjadi acuan pemesanan"
        actions={
          isAdmin ? (
            <>
              <a href="/api/rooms/export" className={btnSecondary}>
                Ekspor CSV
              </a>
              <button type="button" className={btnPrimary} onClick={openAdd}>
                Tambah Ruangan
              </button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            className={inputCls + ' max-w-xs'}
            placeholder="Cari kode / nama / gedung…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={inputCls + ' max-w-[220px]'}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Semua status</option>
            {ROOM_STATUSES.map((st) => (
              <option key={st} value={st}>
                {labelOf(STATUS_LABEL, st)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-sm text-gray-500">Memuat data ruangan…</Card>
      ) : rooms.length === 0 ? (
        <EmptyState
          title="Belum ada ruangan"
          hint="Daftar pemesanan ruangan bergantung pada data ini. Tambahkan ruangan terlebih dahulu agar formulir pemesanan dapat digunakan."
          action={
            isAdmin ? (
              <button type="button" className={btnPrimary} onClick={openAdd}>
                Tambah Ruangan
              </button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama / Jenis</th>
                <th className="px-4 py-3">Gedung / Lantai / Lokasi</th>
                <th className="px-4 py-3">Kapasitas</th>
                <th className="px-4 py-3">Kondisi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Aktif</th>
                {isAdmin && <th className="px-4 py-3">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{r.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.type}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {locationText(r) || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.capacity} orang</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.condition] ?? 'gray'}>
                      {labelOf(STATUS_LABEL, r.condition)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[r.status] ?? 'gray'}>{labelOf(STATUS_LABEL, r.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" className={btnSecondary + ' px-3 py-1 text-xs'} onClick={() => openEdit(r)}>
                          Ubah
                        </button>
                        <button
                          type="button"
                          className={btnDanger + ' px-3 py-1 text-xs'}
                          onClick={() => handleDelete(r)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? 'Ubah Ruangan' : 'Tambah Ruangan'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {editing ? `Memperbarui data ${editing.code}` : 'Lengkapi seluruh data ruangan'}
            </p>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kode *</label>
                <input className={inputCls} value={form.code} onChange={(e) => set('code', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama *</label>
                <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Jenis</label>
                <input className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Gedung</label>
                <input className={inputCls} value={form.building} onChange={(e) => set('building', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lantai</label>
                <input className={inputCls} value={form.floor} onChange={(e) => set('floor', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lokasi</label>
                <input className={inputCls} value={form.location} onChange={(e) => set('location', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kapasitas (orang) *</label>
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Fasilitas</label>
                <input
                  className={inputCls}
                  value={form.facilities}
                  onChange={(e) => set('facilities', e.target.value)}
                  placeholder="AC, proyektor, papan tulis…"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Penanggung Jawab</label>
                <input className={inputCls} value={form.pic} onChange={(e) => set('pic', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kondisi</label>
                <select className={inputCls} value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {labelOf(STATUS_LABEL, c)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {ROOM_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {labelOf(STATUS_LABEL, st)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Catatan</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                    checked={form.isActive}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  Ruangan aktif (dapat dipesan)
                </label>
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" className={btnSecondary} onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
