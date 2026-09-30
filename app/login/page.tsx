'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { inputCls, btnPrimary } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-bold text-gray-900">SIMORA</h1>
          <p className="text-sm text-gray-500">Sistem Monitoring Rapat dan Ruangan Kampus</p>
        </div>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
        <input
          className={inputCls}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button disabled={loading} className={`${btnPrimary} mt-6 w-full`}>
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
        <p className="mt-4 text-center text-xs text-gray-400">Seluruh waktu memakai zona Asia/Makassar (WITA)</p>
      </form>
    </div>
  );
}
