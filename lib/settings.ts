import { prisma } from './prisma';

export interface OpSettings {
  lateToleranceMinutes: number;
  reminderMinutes: number;
  cancellationHours: number;
  timezone: string; // dikunci: Asia/Makassar
}

const DEFAULTS: OpSettings = {
  lateToleranceMinutes: 10,
  reminderMinutes: 30,
  cancellationHours: 2,
  timezone: 'Asia/Makassar',
};

export async function getSettings(): Promise<OpSettings> {
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    return {
      lateToleranceMinutes: Number(map.lateToleranceMinutes ?? DEFAULTS.lateToleranceMinutes) || 10,
      reminderMinutes: Number(map.reminderMinutes ?? DEFAULTS.reminderMinutes) || 30,
      cancellationHours: Number(map.cancellationHours ?? DEFAULTS.cancellationHours) || 2,
      timezone: 'Asia/Makassar', // selalu dikunci, tidak mengikuti pengaturan
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSettings(s: Partial<OpSettings>): Promise<void> {
  const entries: Array<[string, string]> = [];
  if (s.lateToleranceMinutes !== undefined)
    entries.push(['lateToleranceMinutes', String(Math.max(0, Math.min(180, Math.round(s.lateToleranceMinutes))) || 0)]);
  if (s.reminderMinutes !== undefined)
    entries.push(['reminderMinutes', String(Math.max(0, Math.min(10080, Math.round(s.reminderMinutes))) || 0)]);
  if (s.cancellationHours !== undefined)
    entries.push(['cancellationHours', String(Math.max(0, Math.min(720, Math.round(s.cancellationHours))) || 0)]);
  // timezone sengaja tidak disimpan dari input: dikunci ke Asia/Makassar
  for (const [key, value] of entries) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
