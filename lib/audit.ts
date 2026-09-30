import { prisma } from './prisma';

/** Catat aktivitas penting ke audit log. Tidak melempar error. */
export async function logAudit(
  userId: string | null,
  action: string,
  object: string,
  detail?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { userId, action, object, detail } });
  } catch {
    // audit tidak boleh menggagalkan alur utama
  }
}
