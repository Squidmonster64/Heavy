import { prisma } from "@/lib/db";
import { getAthlete, getIntervalsCredentials } from "@/lib/intervals/client";
import { SETTING_KEYS, athleteIdFromEnvOrSettings, getSetting, setSetting } from "@/lib/settings";

export type IntervalsTestResult = {
  connected: boolean;
  athlete: string;
  athleteName?: string | null;
  lastTest: string;
  error?: string;
};

function safeAthleteLabel(id: string, profile?: { id?: string | number; name?: string; firstname?: string; lastname?: string } | null) {
  const fromProfile = profile?.id != null ? String(profile.id) : id;
  const name = profile?.name || [profile?.firstname, profile?.lastname].filter(Boolean).join(" ");
  return { athlete: fromProfile, athleteName: name || null };
}

export async function testIntervalsConnection(fetchImpl?: typeof fetch): Promise<IntervalsTestResult> {
  const lastTest = new Date().toISOString();
  const creds = getIntervalsCredentials();
  const storedAthlete = await getSetting(SETTING_KEYS.athleteId);
  const athlete = athleteIdFromEnvOrSettings(storedAthlete);
  if (!creds) {
    const result = { connected: false, athlete, lastTest, error: "INTERVALS_API_KEY is not configured" };
    await setSetting(SETTING_KEYS.lastIntervalsTest, lastTest);
    return result;
  }
  try {
    const profile = await getAthlete(athlete, creds.apiKey, fetchImpl);
    const labels = safeAthleteLabel(athlete, profile);
    await setSetting(SETTING_KEYS.lastIntervalsTest, lastTest);
    await prisma.syncLog.create({
      data: {
        direction: "test",
        entityType: "intervals",
        status: "ok",
        detail: `Connected as ${labels.athlete}`,
      },
    });
    return { connected: true, ...labels, lastTest };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    await setSetting(SETTING_KEYS.lastIntervalsTest, lastTest);
    await prisma.syncLog.create({
      data: {
        direction: "test",
        entityType: "intervals",
        status: "error",
        detail: message,
      },
    });
    return { connected: false, athlete, lastTest, error: message };
  }
}
