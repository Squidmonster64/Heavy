import { Shell } from "../shell";
import { SyncControls } from "./controls";
import { prisma } from "@/lib/db";
import { SETTING_KEYS, athleteIdFromEnvOrSettings, getSettingsMap } from "@/lib/settings";
import { getIntervalsCredentials } from "@/lib/intervals/client";
import { formatDateTimeAthlete } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const settings = await getSettingsMap(Object.values(SETTING_KEYS));
  const logs = await prisma.syncLog.findMany({ orderBy: { timestamp: "desc" }, take: 30 });
  const fmt = (value?: string | null) => (value ? formatDateTimeAthlete(new Date(value)) : null);
  return (
    <Shell>
      <p className="kicker">Sync</p>
      <h2 className="mt-1 text-3xl">Intervals.icu</h2>
      <div className="mt-4 grid gap-4">
        <SyncControls
          connected={Boolean(getIntervalsCredentials())}
          athlete={athleteIdFromEnvOrSettings(settings[SETTING_KEYS.athleteId])}
          lastPush={fmt(settings[SETTING_KEYS.lastPush])}
          lastPull={fmt(settings[SETTING_KEYS.lastPull])}
          lastTest={fmt(settings[SETTING_KEYS.lastIntervalsTest])}
        />
        <section>
          <h3>Recent sync log</h3>
          <div className="grid gap-2 font-sans text-sm">
            {logs.map((log) => (
              <article key={log.id} className="card">
                <strong>{formatDateTimeAthlete(log.timestamp)}</strong>
                <p className="m-0">{log.direction} · {log.entityType} · {log.status}</p>
                {log.detail ? <p className="muted m-0">{log.detail}</p> : null}
              </article>
            ))}
            {logs.length === 0 ? <p className="muted">No sync events yet.</p> : null}
          </div>
        </section>
      </div>
    </Shell>
  );
}
