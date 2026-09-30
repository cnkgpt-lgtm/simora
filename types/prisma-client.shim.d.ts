/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SHIM TYPING — pengganti darurat hasil `prisma generate`.
 *
 * Dipakai otomatis oleh scripts/fix-prisma-types.mjs ketika `prisma generate`
 * gagal (mis. binary Prisma tidak dapat diunduh karena jaringan).
 * Berisi tipe model + operasi yang dipakai kode aplikasi.
 * Argumen query bertipe longgar (any); tipe kembalian presisi per model.
 *
 * Di Vercel, `prisma generate` asli berhasil (ada jaringan) sehingga file ini
 * tidak dipakai. File ini hanya fallback build lokal offline.
 */

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  type: string;
  building: string;
  floor: string;
  location: string;
  capacity: number;
  facilities: string;
  pic: string;
  condition: string;
  status: string;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  roomId: string;
  requesterId: string;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: Date;
  endsAt: Date;
  title: string;
  purpose: string | null;
  participants: number;
  notes: string | null;
  status: string;
  reviewNote: string | null;
  reviewerId: string | null;
  reviewedAt: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  room?: any;
  requester?: any;
  reviewer?: any;
}

export interface Maintenance {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  description: string;
  status: string;
  picId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  room?: any;
  pic?: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  object: string;
  detail: string | null;
  createdAt: Date;
  user?: any;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface Delegate<T> {
  findMany(args?: any): Promise<T[]>;
  findUnique(args?: any): Promise<T | null>;
  findFirst(args?: any): Promise<T | null>;
  create(args?: any): Promise<T>;
  createMany(args?: any): Promise<{ count: number }>;
  update(args?: any): Promise<T>;
  updateMany(args?: any): Promise<{ count: number }>;
  delete(args?: any): Promise<T>;
  count(args?: any): Promise<number>;
  upsert(args?: any): Promise<T>;
}

export declare class PrismaClient {
  user: Delegate<User>;
  room: Delegate<Room>;
  booking: Delegate<Booking>;
  maintenance: Delegate<Maintenance>;
  notification: Delegate<Notification>;
  auditLog: Delegate<AuditLog>;
  setting: Delegate<Setting>;
  $disconnect(): Promise<void>;
}

export declare const Prisma: any;
export default PrismaClient;
