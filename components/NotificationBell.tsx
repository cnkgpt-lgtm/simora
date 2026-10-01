'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatTanggalJam } from '@/lib/time';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotifPayload {
  items: NotifItem[];
  unread: number;
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const d = await api<NotifPayload>('/api/notifications?unread=1');
      setUnread(d.unread);
    } catch {
      // abaikan; polling berikutnya mencoba lagi
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open ]);

  async function togglePanel() {
    const willOpen = !open;
    setOpen(willOpen);
    if (!willOpen) return;
    setLoading(true);
    try {
      const d = await api<NotifPayload>('/api/notifications');
      setItems(d.items.slice(0, 10));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markRead(id: string) {
    try {
      await api(`/api/notifications/${id}/read`, { method: 'POST' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      await refreshUnread();
    } catch {
      // abaikan
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={togglePanel}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:scale-90 transition-transform duration-150"
        aria-label="Notifikasi"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-enter absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Tutup"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Memuat…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Tidak ada notifikasi</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n.id)}
                      type="button"
                      className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${
                        n.isRead ? '' : 'bg-emerald-50/60'
                      }`}
                    >
                      <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />}
                        <span className="truncate">{n.title}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{n.message}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {formatTanggalJam(n.createdAt)} WITA
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
