import { prisma } from './prisma';

/** Kirim notifikasi dalam aplikasi ke satu pengguna. */
export async function notify(userId: string, type: string, title: string, message: string): Promise<void> {
  try {
    await prisma.notification.create({ data: { userId, type, title, message } });
  } catch {
    // notifikasi tidak boleh menggagalkan alur utama
  }
}

/** Kirim notifikasi ke semua pengguna aktif dengan peran tertentu. */
export async function notifyRole(
  role: string,
  type: string,
  title: string,
  message: string,
  excludeUserId?: string,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { role, isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
      select: { id: true },
    });
    if (users.length === 0) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, type, title, message })),
    });
  } catch {
    // abaikan
  }
}
