'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { inputCls, btnPrimary, Card } from '@/components/ui';

export default function BootstrapPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    lateToleranceMinutes: 10,
    reminderMinutes: 30,
    cancellationHours: 2,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ initialized: boolean }>('/api/bootstrap')
      .then((d) => {
        if (d.initialized) router.replace('/login');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/bootstrap', { method: 'POST', body: JSON.stringify(form) });
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktivasi gagal');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <p className="p-8 text-center text-sm text-gray-500">Memeriksa…</p>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Aktivasi Admin Pertama</h1>
        <p className="mb-6 mt-1 text-sm text-gray-500">
          Buat akun administrator awal. Setelah ini, akun lain dibuat oleh admin lewat menu Pengaturan.
        </p>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="mb-1 block text-sm font-medium text-gray-700">Nama lengkap</label>
        <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">Username</label>
        <input className={inputCls} value={form.username} onChange={(e) => set('username', e.target.value)} required />
        <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">Password (min. 8 karakter)</label>
        <input
          type="password"
          className={inputCls}
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          minLength={8}
          required
        />
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="mb-3 text-sm font-medium text-gray-900">Pengaturan operasional</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Toleransi terlambat (mnt)</label>
              <input
                type="number"
                min={0}
                max={180}
                className={inputCls}
                value={form.lateToleranceMinutes}
                onChange={(e) => set('lateToleranceMinutes', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Pengingat (mnt)</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.reminderMinutes}
                onChange={(e) => set('reminderMinutes', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Batas batal (jam)</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.cancellationHours}
                onChange={(e) => set('cancellationHours', Number(e.target.value))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">Zona waktu dikunci: Asia/Makassar (WITA).</p>
        </div>
        <button disabled={loading} className={`${btnPrimary} mt-6 w-full`}>
          {loading ? 'Memproses…' : 'Aktifkan Admin'}
        </button>
      </form>
    </div>
  );
}
