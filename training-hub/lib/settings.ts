import { prisma } from "./db";

export const SETTING_KEYS = {
  athleteId: "intervals.athleteId",
  lastIntervalsTest: "intervals.lastTest",
  lastPush: "intervals.lastPush",
  lastPull: "intervals.lastPull",
  ftp: "thresholds.ftp",
  ftpStale: "thresholds.ftpStale",
  rollingFtp: "thresholds.rollingFtp",
  lthr: "thresholds.lthr",
  maxHr: "thresholds.maxHr",
  taperPct: "taper.defaultPct",
  timezone: "athlete.timezone",
  symptomFlags: "athlete.symptomFlagsByDate",
} as const;

export async function getSetting(key: string) {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getSettingsMap(keys: string[]) {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
}

export function athleteIdFromEnvOrSettings(stored?: string | null) {
  return process.env.INTERVALS_ATHLETE_ID || stored || "0";
}

export function parseSymptomFlags(raw: string | null): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
