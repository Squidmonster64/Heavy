import { Shell } from "../shell";
import { SettingsForm } from "./form";
import { SETTING_KEYS, athleteIdFromEnvOrSettings, getSettingsMap } from "@/lib/settings";
import { getIntervalsCredentials } from "@/lib/intervals/client";
import { formatDateTimeAthlete } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsMap(Object.values(SETTING_KEYS));
  return (
    <Shell>
      <p className="kicker">Settings</p>
      <h2 className="mt-1 mb-4 text-3xl">Athlete</h2>
      <SettingsForm
        athlete={athleteIdFromEnvOrSettings(settings[SETTING_KEYS.athleteId])}
        ftp={settings[SETTING_KEYS.ftp] ?? "144"}
        ftpStale={settings[SETTING_KEYS.ftpStale] !== "false"}
        rollingFtp={settings[SETTING_KEYS.rollingFtp] ?? "186"}
        lthr={settings[SETTING_KEYS.lthr] ?? "168"}
        maxHr={settings[SETTING_KEYS.maxHr] ?? "185"}
        taperPct={settings[SETTING_KEYS.taperPct] ?? "35"}
        timezone={settings[SETTING_KEYS.timezone] ?? "Australia/Perth"}
        lastTest={settings[SETTING_KEYS.lastIntervalsTest] ? formatDateTimeAthlete(new Date(settings[SETTING_KEYS.lastIntervalsTest])) : null}
        connected={Boolean(getIntervalsCredentials())}
      />
    </Shell>
  );
}
