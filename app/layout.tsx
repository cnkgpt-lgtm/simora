import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SIMORA - Monitoring Rapat & Ruangan Kampus',
  description: 'Sistem Monitoring Rapat dan Ruangan Kampus',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
