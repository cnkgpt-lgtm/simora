import { minutesBetween } from './time';

export type OpStatus = 'terjadwal' | 'berlangsung' | 'selesai' | 'dibatalkan';

export interface MeetingLike {
  status: string; // status pemesanan: menunggu | disetujui | ditolak | dibatalkan
  actualStart: Date | string | null;
  actualEnd: Date | string | null;
  startsAt: Date | string;
  endsAt: Date | string;
}

/**
 * Status operasional rapat (derivasi dari data pemesanan).
 * - dibatalkan: pemesanan dibatalkan/ditolak
 * - selesai: sudah ditandai selesai (actualEnd)
 * - berlangsung: sudah mulai (otomatis saat waktu tiba) dan belum selesai
 * - terjadwal: disetujui tapi waktunya belum tiba (atau masih menunggu persetujuan)
 */
export function opStatus(b: MeetingLike, now: Date = new Date()): OpStatus {
  if (b.status === 'dibatalkan' || b.status === 'ditolak') return 'dibatalkan';
  if (b.actualEnd) return 'selesai';
  if (b.status !== 'disetujui') return 'terjadwal';
  const n = now.getTime();
  const s = new Date(b.startsAt).getTime();
  if (b.actualStart || n >= s) return 'berlangsung';
  return 'terjadwal';
}

/** Rapat mulai lebih lambat dari toleransi (menit) setelah jadwal. */
export function isTerlambat(b: MeetingLike, toleranceMinutes: number): boolean {
  if (!b.actualStart) return false;
  return minutesBetween(b.startsAt, b.actualStart) > toleranceMinutes;
}

/** Rapat masih berlangsung melewati jam selesai. */
export function isMelewatiWaktu(b: MeetingLike, now: Date = new Date()): boolean {
  if (opStatus(b, now) !== 'berlangsung') return false;
  return now.getTime() > new Date(b.endsAt).getTime();
}
