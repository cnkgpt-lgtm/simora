'use client';

import { usePathname } from 'next/navigation';

/** Transisi halus (fade + geser naik) setiap pindah halaman di dalam aplikasi. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
