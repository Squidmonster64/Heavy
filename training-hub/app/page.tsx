import { Shell } from "./shell";
import { SymptomFlags } from "./symptom-flags";
import { prisma } from "@/lib/db";
import { addDays, dateKeyFromStored, formatAthleteLong, formatDateTimeAthlete, todayAthleteDateKey } from "@/lib/dates";
import { estimatedMinutes } from "@/lib/validation/structures";
import { SETTING_KEYS, getSettingsMap, parseSymptomFlags } from "@/lib/settings";
import { getActiveProgram } from "@/lib/program/service";
import { suggestProgression } from "@/lib/progression";
import type { StrengthStructure } from "@/lib/validation/structures";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const today = todayAthleteDateKey();
  const program = await getActiveProgram();
  const sessions = await prisma.scheduledSession.findMany({
    where: { date: { gte: new Date(`${today}T00:00:00.000Z`), lte: new Date(`${today}T00:00:00.000Z`) } },
    orderBy: { modality: "asc" },
  });
  const settings = await getSettingsMap(Object.values(SETTING_KEYS));
  const allFlags = parseSymptomFlags(settings[SETTING_KEYS.symptomFlags] ?? null);
  const flags = allFlags[today] ?? [];
  const yesterday = addDays(today, -1);
  const yesterdaySessions = await prisma.scheduledSession.findMany({ where: { date: new Date(`${yesterday}T00:00:00.000Z`) } });
  const wellness = await prisma.wellnessSnapshot.findUnique({ where: { date: new Date(`${today}T00:00:00.000Z`) } });
  const lastPull = settings[SETTING_KEYS.lastPull];
  const byModality = {
    REHAB: sessions.find((session) => session.modality === "REHAB"),
    STRENGTH: sessions.find((session) => session.modality === "STRENGTH"),
    RUN: sessions.find((session) => session.modality === "RUN"),
    CYCLE: sessions.find((session) => session.modality === "CYCLE"),
  };

  return (
    <Shell>
      <p className="kicker">Today</p>
      <h2 className="mt-1 text-3xl">{formatAthleteLong(today)}</h2>
      <p className="muted font-sans text-sm">{program?.name ?? "No active program"}{flags.length ? ` · flags: ${flags.join(", ")}` : ""}</p>
      <SymptomFlags date={today} allFlags={allFlags} />
      <div className="mt-6 grid gap-4">
        {(["REHAB", "STRENGTH", "RUN", "CYCLE"] as const).map((modality) => {
          const session = byModality[modality];
          if (!session) {
            return (
              <article key={modality} className="card">
                <p className="kicker">{modality}</p>
                <h3 className="m-0">No {modality.toLowerCase()} scheduled</h3>
              </article>
            );
          }
          const suggestions = session.modality === "STRENGTH" && program
            ? suggestProgression({
                structure: session.plannedStructure as StrengthStructure,
                programStart: dateKeyFromStored(program.startDate),
                dateKey: today,
                completion: session.completion as { completedAllReps?: boolean; techniqueAccepted?: boolean; failureFlag?: boolean; rpe?: number } | null,
              })
            : [];
          return (
            <SessionCard
              key={session.id}
              session={{
                id: session.id,
                modality: session.modality,
                templateName: session.templateName,
                status: session.status,
                matchStatus: session.matchStatus,
                minutes: estimatedMinutes(session.modality, session.plannedStructure),
                plannedStructure: session.plannedStructure,
                originalStructure: session.originalStructure,
                notes: session.notes,
              }}
              suggestions={suggestions}
            />
          );
        })}
      </div>
      <section className="card mt-6 font-sans text-sm">
        <p className="kicker">Intervals.icu</p>
        <p className="m-0 mt-2">Last sync: {lastPull ? formatDateTimeAthlete(new Date(lastPull)) : "never"}</p>
        <p className="m-0">Wellness: {wellness ? "synced" : "not yet"}</p>
        <p className="m-0">Yesterday: {yesterdaySessions.some((session) => session.matchStatus === "AUTO_MATCHED" || session.matchStatus === "MANUAL_MATCHED") ? "matched" : "unmatched"}</p>
      </section>
    </Shell>
  );
}
