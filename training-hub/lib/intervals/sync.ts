import { MatchStatus, type Modality, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dateKeyFromStored, todayAthleteDateKey } from "@/lib/dates";
import { estimatedMinutes, parseStructure } from "@/lib/validation/structures";
import { describeSession, intervalsTypeFor } from "@/lib/export/intervalsDescription";
import { bulkUpsertEvents, externalIdForSession, getIntervalsCredentials, listActivities, listWellness } from "@/lib/intervals/client";
import { decideMatch, modalityFromActivityType, type MatchableActivity } from "@/lib/matching/matcher";
import { SETTING_KEYS, athleteIdFromEnvOrSettings, getSetting, setSetting } from "@/lib/settings";
import { mergeProgramConfig } from "@/lib/config";

function activityDate(activity: { start_date_local?: string }) {
  return (activity.start_date_local ?? "").slice(0, 10);
}

function plannedMetrics(modality: Modality, structure: unknown) {
  const minutes = estimatedMinutes(modality, structure);
  let plannedDistanceM: number | null = null;
  if (modality === "RUN") {
    try {
      const run = parseStructure("RUN", structure);
      if ("workKm" in run && run.workKm) plannedDistanceM = run.workKm * 1000 * run.reps;
    } catch {
      plannedDistanceM = null;
    }
  }
  return { plannedDurationSec: minutes != null ? minutes * 60 : null, plannedDistanceM };
}

export async function pushPlan(options?: { from?: string; to?: string; fetchImpl?: typeof fetch }) {
  const creds = getIntervalsCredentials();
  if (!creds) throw new Error("INTERVALS_API_KEY is not configured");
  const athlete = athleteIdFromEnvOrSettings(await getSetting(SETTING_KEYS.athleteId));
  const from = options?.from ?? todayAthleteDateKey();
  const to = options?.to ?? addDays(from, 42);
  const sessions = await prisma.scheduledSession.findMany({
    where: {
      date: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) },
      status: { in: ["PLANNED", "COMPLETED"] },
    },
    orderBy: { date: "asc" },
  });
  const events = sessions.map((session) => ({
    external_id: session.intervalsExternalId || externalIdForSession(session.id),
    category: "WORKOUT" as const,
    start_date_local: `${dateKeyFromStored(session.date)}T00:00:00`,
    type: intervalsTypeFor(session.modality),
    name: session.templateName || session.modality,
    description: describeSession(session.modality, session.templateName || session.modality, session.plannedStructure),
  }));
  const result = events.length
    ? await bulkUpsertEvents({ athleteId: athlete, apiKey: creds.apiKey, events, fetchImpl: options?.fetchImpl })
    : [];
  const returned = Array.isArray(result) ? result : [];
  for (const session of sessions) {
    const match = returned.find((event) => event.external_id === (session.intervalsExternalId || externalIdForSession(session.id)));
    await prisma.scheduledSession.update({
      where: { id: session.id },
      data: {
        intervalsExternalId: session.intervalsExternalId || externalIdForSession(session.id),
        ...(match?.id != null ? { intervalsEventId: String(match.id) } : {}),
      },
    });
  }
  const when = new Date().toISOString();
  await setSetting(SETTING_KEYS.lastPush, when);
  await prisma.syncLog.create({
    data: {
      direction: "push",
      entityType: "events",
      status: "ok",
      detail: `Upserted ${events.length} planned sessions ${from} to ${to}`,
    },
  });
  return { count: events.length, from, to, lastPush: when };
}

function asActivityArray(payload: unknown) {
  return Array.isArray(payload) ? payload : [];
}

function asWellnessArray(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") return Object.values(payload);
  return [];
}

export async function pullActuals(options?: { days?: number; initial?: boolean; fetchImpl?: typeof fetch }) {
  const creds = getIntervalsCredentials();
  if (!creds) throw new Error("INTERVALS_API_KEY is not configured");
  const athlete = athleteIdFromEnvOrSettings(await getSetting(SETTING_KEYS.athleteId));
  const newest = todayAthleteDateKey();
  const windowDays = options?.initial ? 42 : options?.days ?? 7;
  const oldest = addDays(newest, -windowDays);
  const newestOverlap = addDays(newest, 1);
  const activities = asActivityArray(
    await listActivities({
      athleteId: athlete,
      apiKey: creds.apiKey,
      oldest,
      newest: newestOverlap,
      fetchImpl: options?.fetchImpl,
    }),
  );
  const wellness = asWellnessArray(
    await listWellness({
      athleteId: athlete,
      apiKey: creds.apiKey,
      oldest,
      newest,
      fetchImpl: options?.fetchImpl,
    }),
  );

  const summaries: MatchableActivity[] = [];
  for (const activity of activities) {
    const id = String(activity.id);
    const date = activityDate(activity);
    if (!date) continue;
    const summary = {
      intervalsActivityId: id,
      date: new Date(`${date}T00:00:00.000Z`),
      type: String(activity.type ?? "Other"),
      name: activity.name ? String(activity.name) : null,
      durationSec: Number(activity.moving_time ?? activity.elapsed_time ?? 0) || null,
      distanceM: Number(activity.distance ?? 0) || null,
      startTime: activity.start_date_local ? new Date(activity.start_date_local) : null,
      load: activity.icu_training_load != null ? Number(activity.icu_training_load) : null,
      summary: {
        id,
        type: activity.type,
        name: activity.name,
        durationSec: activity.moving_time ?? activity.elapsed_time ?? null,
        distance: activity.distance ?? null,
        load: activity.icu_training_load ?? null,
      } as Prisma.InputJsonValue,
    };
    await prisma.pulledActivity.upsert({
      where: { intervalsActivityId: id },
      create: summary,
      update: summary,
    });
    summaries.push({
      id,
      date,
      type: String(activity.type ?? "Other"),
      name: activity.name ? String(activity.name) : null,
      durationSec: Number(activity.moving_time ?? activity.elapsed_time ?? 0) || null,
      distanceM: Number(activity.distance ?? 0) || null,
      startTime: activity.start_date_local ? String(activity.start_date_local) : null,
    });
  }

  for (const row of wellness) {
    const record = row as Record<string, unknown>;
    const date = String(record.id ?? record.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    await prisma.wellnessSnapshot.upsert({
      where: { date: new Date(`${date}T00:00:00.000Z`) },
      create: { date: new Date(`${date}T00:00:00.000Z`), source: "intervals.icu", raw: record as Prisma.InputJsonValue },
      update: { raw: record as Prisma.InputJsonValue },
    });
  }

  const program = await prisma.program.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  const config = mergeProgramConfig(program?.config);
  const sessions = await prisma.scheduledSession.findMany({
    where: {
      date: { gte: new Date(`${oldest}T00:00:00.000Z`), lte: new Date(`${newest}T00:00:00.000Z`) },
      status: { in: ["PLANNED", "COMPLETED"] },
    },
  });

  for (const session of sessions) {
    if (session.matchStatus === "MANUAL_MATCHED") continue;
    const date = dateKeyFromStored(session.date);
    const metrics = plannedMetrics(session.modality, session.plannedStructure);
    const decision = decideMatch(
      {
        id: session.id,
        date,
        modality: session.modality,
        templateName: session.templateName,
        ...metrics,
      },
      summaries.filter((activity) => activity.date === date),
      { high: config.matching.highThreshold, low: config.matching.lowThreshold },
    );
    await prisma.activityMatchCandidate.deleteMany({ where: { scheduledSessionId: session.id } });
    const candidateScores = decision.status === "UNMATCHED" ? decision.scores : decision.scores;
    for (const score of candidateScores.slice(0, 5)) {
      await prisma.activityMatchCandidate.create({
        data: {
          scheduledSessionId: session.id,
          intervalsActivityId: score.activityId,
          confidence: score.confidence,
          detail: { reasons: score.reasons } as Prisma.InputJsonValue,
        },
      });
    }
    if (decision.status === "AUTO_MATCHED") {
      await prisma.scheduledSession.update({
        where: { id: session.id },
        data: {
          matchStatus: MatchStatus.AUTO_MATCHED,
          matchConfidence: decision.confidence,
          intervalsActivityId: decision.activityId,
          status: session.status === "PLANNED" ? "COMPLETED" : session.status,
        },
      });
    } else if (decision.status === "AMBIGUOUS") {
      await prisma.scheduledSession.update({
        where: { id: session.id },
        data: { matchStatus: MatchStatus.AMBIGUOUS, matchConfidence: decision.scores[0]?.confidence ?? null },
      });
    } else if (session.matchStatus !== "UNMATCHED") {
      await prisma.scheduledSession.update({
        where: { id: session.id },
        data: { matchStatus: MatchStatus.UNMATCHED, matchConfidence: null },
      });
    }
  }

  const when = new Date().toISOString();
  await setSetting(SETTING_KEYS.lastPull, when);
  await prisma.syncLog.create({
    data: {
      direction: "pull",
      entityType: "activities+wellness",
      status: "ok",
      detail: `Pulled ${summaries.length} activities and ${wellness.length} wellness rows (${oldest}–${newest})`,
    },
  });
  return { activities: summaries.length, wellness: wellness.length, oldest, newest, lastPull: when };
}

export async function syncNow(fetchImpl?: typeof fetch) {
  const push = await pushPlan({ fetchImpl });
  const pull = await pullActuals({ fetchImpl });
  await prisma.syncLog.create({
    data: {
      direction: "sync",
      entityType: "intervals",
      status: "ok",
      detail: `Push ${push.count}; pull ${pull.activities} activities`,
    },
  });
  return { push, pull };
}

export { modalityFromActivityType };
