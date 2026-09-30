import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const COOKIE_NAME = 'simora_session';
const MAX_AGE = 7 * 24 * 3600; // 7 hari

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string; // admin | pegawai | petugas_ruangan
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET belum diisi di environment');
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString('base64url');
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const raw = store.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const [payload, sig] = raw.split('.');
    if (!payload || !sig || sign(payload) !== sig) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { id: data.id, name: data.name, username: data.username, role: data.role };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
