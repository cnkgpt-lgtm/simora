'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatTanggalJam } from '@/lib/time';
import {
  Card,
  PageHeader,
  Badge,
  EmptyState,
  inputCls,
  btnPrimary,
  btnSecondary,
  ROLE_LABEL,
} from '@/components/ui';

interface Me {
  role: string;
}

interface OpSettings {
  lateToleranceMinutes: number;
  reminderMinutes: number;
  cancellationHours: number;
  timezone: string;
}

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  object: string;
  detail: string | null;
  createdAt: string;
  user: { name: string } | null;
}

type Tab = 'operasional' | 'pengguna' | 'audit';

const ROLE_OPTIONS = ['admin', 'pegawai', 'petugas_ruangan'];

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'operasional', label: 'Operasional' },
  { id: 'pengguna', label: 'Pengguna' },
  { id: 'audit', label: 'Audit Log' },
];

export default function PengaturanPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('operasional');

  // --- Operasional ---
  const [settings, setSettings] = useState<OpSettings | null>(null);
  const [fLate, setFLate] = useState('10');
  const [fReminder, setFReminder] = useState('30');
  const [fCancel, setFCancel] = useState('2');
  const [setLoading, setSetLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // --- Pengguna ---
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [aName, setAName] = useState('');
  const [aUsername, setAUsername] = useState('');
  const [aPassword, setAPassword] = useState('');
  const [aRole, setARole] = useState('pegawai');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [eName, setEName] = useState('');
  const [eRole, setERole] = useState('pegawai');
  const [eActive, setEActive] = useState(true);
  const [ePassword, setEPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editing, setEditing] = useState(false);

  // --- Audit ---
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    api<Me>('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, []);

  const loadSettings = useCallback(async () => {
    setSetLoading(true);
    try {
      const s = await api<OpSettings>('/api/settings');
      setSettings(s);
      setFLate(String(s.lateToleranceMinutes));
      setFReminder(String(s.reminderMinutes));
      setFCancel(String(s.cancellationHours));
    } catch {
      setSettings(null);
    } finally {
      setSetLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const list = await api<UserRow[]>('/api/users');
      setUsers(list);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : 'Gagal memuat pengguna');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const list = await api<AuditRow[]>('/api/audit?limit=100');
      setAudit(list);
    } catch {
      setAudit([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.role === 'admin') {
      loadSettings();
      loadUsers();
      loadAudit();
    }
  }, [me, loadSettings, loadUsers, loadAudit]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg('');
    setSetLoading(true);
    try {
      const s = await api<OpSettings>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          lateToleranceMinutes: Number(fLate),
          reminderMinutes: Number(fReminder),
          cancellationHours: Number(fCancel),
        }),
      });
      setSettings(s);
      setSaveMsg('Pengaturan berhasil disimpan.');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSetLoading(false);
    }
  }

  function openAdd() {
    setAddError('');
    setAName('');
    setAUsername('');
    setAPassword('');
    setARole('pegawai');
    setShowAdd(true);
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name: aName, username: aUsername, password: aPassword, role: aRole }),
      });
      setShowAdd(false);
      await loadUsers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Gagal menambah pengguna');
    } finally {
      setAdding(false);
    }
  }

  function openEdit(u: UserRow) {
    setEditError('');
    setEditUser(u);
    setEName(u.name);
    setERole(u.role);
    setEActive(u.isActive);
    setEPassword('');
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError('');
    setEditing(true);
    try {
      await api(`/api/users/${editUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: eName,
          role: eRole,
          isActive: eActive,
          ...(ePassword ? { password: ePassword } : {}),
        }),
      });
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
    } finally {
      setEditing(false);
    }
  }

  if (meLoading) return <p className="p-8 text-center text-sm text-gray-500">Memuat…</p>;
  if (!me || me.role !== 'admin') {
    return <EmptyState title="Akses ditolak" hint="Halaman pengaturan hanya dapat diakses oleh admin." />;
  }

  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Kelola operasional sistem, pengguna, dan audit log" />

      <div className="mb-5 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            type="button"
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'operasional' && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-bold text-gray-900">Pengaturan Operasional</h2>
          <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Zona waktu dikunci: Asia/Makassar (WITA)
          </p>
          {setLoading && !settings ? (
            <p className="text-sm text-gray-500">Memuat…</p>
          ) : (
            <form onSubmit={saveSettings} className="max-w-md space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Toleransi keterlambatan (menit)
                </label>
                <input
                  type="number"
                  min={0}
                  value={fLate}
                  onChange={(e) => setFLate(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Rapat dianggap terlambat jika dimulai lebih dari nilai ini setelah jadwal.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Pengingat (menit)</label>
                <input
                  type="number"
                  min={0}
                  value={fReminder}
                  onChange={(e) => setFReminder(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pengingat dikirim sekian menit sebelum rapat dimulai.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Batas pembatalan (jam)</label>
                <input
                  type="number"
                  min={0}
                  value={fCancel}
                  onChange={(e) => setFCancel(e.target.value)}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Pemesanan tidak dapat dibatalkan kurang dari nilai ini sebelum waktu mulai.
                </p>
              </div>
              {saveMsg && (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    saveMsg.includes('berhasil') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {saveMsg}
                </p>
              )}
              <button type="submit" disabled={setLoading} className={btnPrimary}>
                {setLoading ? 'Menyimpan…' : 'Simpan'}
              </button>
            </form>
          )}
        </Card>
      )}

      {tab === 'pengguna' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={openAdd} className={btnPrimary} type="button">
              + Tambah Pengguna
            </button>
          </div>
          {usersError && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{usersError}</p>
          )}
          <Card>
            {usersLoading ? (
              <p className="p-8 text-center text-sm text-gray-500">Memuat…</p>
            ) : users.length === 0 ? (
              <EmptyState title="Belum ada pengguna" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Nama</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Username</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Peran</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-700">{u.username}</td>
                        <td className="px-4 py-3">
                          <Badge tone={u.role === 'admin' ? 'purple' : u.role === 'petugas_ruangan' ? 'blue' : 'gray'}>
                            {ROLE_LABEL[u.role] ?? u.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(u)} className={btnSecondary} type="button">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'audit' && (
        <Card>
          {auditLoading ? (
            <p className="p-8 text-center text-sm text-gray-500">Memuat…</p>
          ) : audit.length === 0 ? (
            <EmptyState title="Belum ada audit log" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Waktu</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Pengguna</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Aksi</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Objek</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-500">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {audit.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {formatTanggalJam(a.createdAt)} WITA
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.user?.name ?? '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-800">{a.action}</td>
                      <td className="px-4 py-3 text-gray-700">{a.object}</td>
                      <td className="max-w-md truncate px-4 py-3 text-gray-700" title={a.detail ?? ''}>
                        {a.detail ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal tambah pengguna */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitAdd} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-bold text-gray-900">Tambah Pengguna</h2>
            {addError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{addError}</p>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama</label>
                <input value={aName} onChange={(e) => setAName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                <input value={aUsername} onChange={(e) => setAUsername(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={aPassword}
                  onChange={(e) => setAPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                  placeholder="Minimal 8 karakter"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Peran</label>
                <select value={aRole} onChange={(e) => setARole(e.target.value)} className={inputCls}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>
                Batal
              </button>
              <button type="submit" disabled={adding} className={btnPrimary}>
                {adding ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal edit pengguna */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submitEdit} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-base font-bold text-gray-900">Edit Pengguna</h2>
            <p className="mb-4 text-sm text-gray-500">{editUser.username}</p>
            {editError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>
            )}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nama</label>
                <input value={eName} onChange={(e) => setEName(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Peran</label>
                <select value={eRole} onChange={(e) => setERole(e.target.value)} className={inputCls}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r] ?? r}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={eActive}
                  onChange={(e) => setEActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                Akun aktif
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reset password (opsional)</label>
                <input
                  type="password"
                  value={ePassword}
                  onChange={(e) => setEPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Kosongkan jika tidak diubah"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditUser(null)} className={btnSecondary}>
                Batal
              </button>
              <button type="submit" disabled={editing} className={btnPrimary}>
                {editing ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
