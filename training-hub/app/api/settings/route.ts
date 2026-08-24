import { NextRequest, NextResponse } from "next/server";
import { unauthorizedIfNeeded } from "@/lib/api";
import { SETTING_KEYS, athleteIdFromEnvOrSettings, getSettingsMap, setSetting } from "@/lib/settings";
import { getIntervalsCredentials } from "@/lib/intervals/client";

  const EDITABLE = new Set<string>([
  SETTING_KEYS.athleteId,
  SETTING_KEYS.ftp,
  SETTING_KEYS.ftpStale,
  SETTING_KEYS.rollingFtp,
  SETTING_KEYS.lthr,
  SETTING_KEYS.maxHr,
  SETTING_KEYS.taperPct,
  SETTING_KEYS.timezone,
  SETTING_KEYS.symptomFlags,
]);

export async function GET() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const settings = await getSettingsMap(Object.values(SETTING_KEYS));
  return NextResponse.json({
    intervalsConfigured: Boolean(getIntervalsCredentials()),
    athlete: athleteIdFromEnvOrSettings(settings[SETTING_KEYS.athleteId]),
    lastTest: settings[SETTING_KEYS.lastIntervalsTest] ?? null,
    lastPush: settings[SETTING_KEYS.lastPush] ?? null,
    lastPull: settings[SETTING_KEYS.lastPull] ?? null,
    ftp: settings[SETTING_KEYS.ftp] ?? "144",
    ftpStale: settings[SETTING_KEYS.ftpStale] !== "false",
    rollingFtp: settings[SETTING_KEYS.rollingFtp] ?? "186",
    lthr: settings[SETTING_KEYS.lthr] ?? "168",
    maxHr: settings[SETTING_KEYS.maxHr] ?? "185",
    taperPct: settings[SETTING_KEYS.taperPct] ?? "35",
    timezone: settings[SETTING_KEYS.timezone] ?? "Australia/Perth",
    symptomFlags: settings[SETTING_KEYS.symptomFlags] ?? "{}",
  });
}

export async function PATCH(request: NextRequest) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  for (const [key, value] of Object.entries(body)) {
    const mapped = (SETTING_KEYS as Record<string, string>)[key] ?? key;
    if (!EDITABLE.has(mapped)) continue;
    await setSetting(mapped, String(value));
  }
  return GET();
}
