'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        try {
          await api('/api/auth/logout', { method: 'POST' });
        } catch {
          // tetap keluar walau request gagal
        }
        router.push('/login');
        router.refresh();
      }}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Keluar
    </button>
  );
}
