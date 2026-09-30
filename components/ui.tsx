import React from 'react';

export const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100';

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed';

export const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
  'inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed';

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
};

export function Badge({ tone = 'gray', children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone] ?? TONES.gray}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </Card>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center justify-center p-10 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {hint && <p className="mt-1 max-w-md text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

/** Label Indonesia untuk status operasional & master. */
export const STATUS_LABEL: Record<string, string> = {
  terjadwal: 'Terjadwal',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  tersedia: 'Tersedia',
  digunakan: 'Digunakan',
  pemeliharaan: 'Pemeliharaan',
  dijadwalkan: 'Dijadwalkan',
  baik: 'Baik',
  'rusak ringan': 'Rusak Ringan',
  'rusak berat': 'Rusak Berat',
};

/** Warna badge untuk tiap status. */
export const STATUS_TONE: Record<string, string> = {
  terjadwal: 'blue',
  berlangsung: 'green',
  selesai: 'gray',
  dibatalkan: 'red',
  menunggu: 'yellow',
  disetujui: 'green',
  ditolak: 'red',
  tersedia: 'green',
  digunakan: 'blue',
  pemeliharaan: 'amber',
  dijadwalkan: 'blue',
  baik: 'green',
  'rusak ringan': 'yellow',
  'rusak berat': 'red',
};

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  pegawai: 'Pegawai',
  petugas_ruangan: 'Petugas Ruangan',
};
