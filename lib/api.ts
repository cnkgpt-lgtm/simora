'use client';

/** Helper fetch JSON client-side. Melempar Error dengan pesan dari server. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `Permintaan gagal (${res.status})`);
  }
  return json.data as T;
}
