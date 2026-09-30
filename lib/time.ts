// Seluruh waktu aplikasi memakai zona Asia/Makassar (WITA, UTC+8, tanpa DST).
// Jangan pernah memakai zona perangkat/browser untuk logika tanggal & jam.

export const TZ = 'Asia/Makassar';

function fmt(opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, ...opts });
}

/** Tanggal hari ini di Makassar, format YYYY-MM-DD */
export function makassarToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Waktu sekarang (instant). Perbandingan memakai UTC instant; tampilan selalu via TZ. */
export function makassarNow(): Date {
  return new Date();
}

/** YYYY-MM-DD plus n hari */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Konversi tanggal+jam lokal Makassar menjadi instant UTC untuk disimpan di DB. */
export function makassarToUtc(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 8, mi, 0));
}

function cleanTime(s: string): string {
  return s.replace(/\./g, ':');
}

/** "29 September 2026" (WITA) */
export function formatTanggal(d: Date | string): string {
  return fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
}

/** "10:30" (WITA) */
export function formatJam(d: Date | string): string {
  return cleanTime(fmt({ hour: '2-digit', minute: '2-digit' }).format(new Date(d)));
}

/** "29 Sep 2026, 10:30" (WITA) */
export function formatTanggalJam(d: Date | string): string {
  return cleanTime(
    fmt({ day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)),
  );
}

/** Selisih menit b - a */
export function minutesBetween(a: Date | string, b: Date | string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}
