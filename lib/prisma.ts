import { PrismaClient } from '@prisma/client';

// PrismaClient diinstansiasi secara malas (lazy) lewat Proxy agar modul ini
// aman diimpor saat `next build` (collect page data) tanpa koneksi DB /
// tanpa client hasil `prisma generate`. Instansiasi nyata terjadi pada
// akses properti pertama (saat request runtime).

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = createClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
