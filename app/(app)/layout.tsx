import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { ROLE_LABEL } from '@/components/ui';
import NotificationBell from '@/components/NotificationBell';
import LogoutButton from '@/components/LogoutButton';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/ruangan', label: 'Ruangan' },
  { href: '/pemesanan', label: 'Pemesanan' },
  { href: '/pemeliharaan', label: 'Pemeliharaan' },
  { href: '/laporan', label: 'Laporan' },
  { href: '/pengaturan', label: 'Pengaturan', admin: true },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect('/login');
  const nav = NAV.filter((i) => !i.admin || s.role === 'admin');

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-base font-bold text-white">
            S
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">SIMORA</p>
            <p className="text-[11px] text-gray-500">Monitoring Rapat Kampus</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
          <p className="text-xs text-gray-500">{ROLE_LABEL[s.role] ?? s.role}</p>
          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <p className="text-sm font-bold text-gray-900 lg:hidden">SIMORA</p>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="hidden text-sm text-gray-600 sm:block">{s.name}</span>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-emerald-50"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
