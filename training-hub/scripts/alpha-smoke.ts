import { prisma } from "../lib/db";
import { addDays, dateKeyFromStored, parseAthleteDate, todayAthleteDateKey } from "../lib/dates";
import { testIntervalsConnection } from "../lib/intervals/test";
import { pullActuals, pushPlan } from "../lib/intervals/sync";
import { encodeWatchletic } from "../lib/export/watchletic";
import { parseStructure } from "../lib/validation/structures";

async function log(status: "ok" | "error", detail: string) {
  try {
    await prisma.syncLog.create({
      data: {
        direction: "alpha",
        entityType: "smoke",
        status,
        detail,
      },
    });
  } catch {
    // Smoke logging must never prevent the app from starting.
  }
}

async function main() {
  const today = todayAthleteDateKey();
  const through = addDays(today, 13);
  const plannedCount = await prisma.scheduledSession.count({
    where: {
      date: {
        gte: parseAthleteDate(today),
        lte: parseAthleteDate(through),
      },
    },
  });

  console.log(`[alpha] planned sessions ${today}..${through}: ${plannedCount}`);

  const runSession = await prisma.scheduledSession.findFirst({
    where: {
      modality: "RUN",
      status: "PLANNED",
      date: { gte: parseAthleteDate(today), lte: parseAthleteDate(through) },
    },
    orderBy: { date: "asc" },
  });

  if (runSession) {
    const structure = parseStructure("RUN", runSession.plannedStructure);
    const encoded = encodeWatchletic(structure, { name: runSession.templateName || "Training Hub Run" });
    const exportOk = encoded.url.startsWith("https://watchletic.com/w/") && !encoded.base64.includes("/");
    console.log(`[alpha] Watchletic export ${exportOk ? "OK" : "FAILED"} for ${dateKeyFromStored(runSession.date)}`);
    await log(exportOk ? "ok" : "error", `Watchletic export ${exportOk ? "verified" : "failed"} for ${runSession.id}`);
  } else {
    console.log("[alpha] No planned run found for Watchletic smoke test");
    await log("error", "No planned run found for Watchletic smoke test");
  }

  const connection = await testIntervalsConnection();
  console.log(`[alpha] Intervals connection: ${connection.connected ? "connected" : "failed"}`);
  if (!connection.connected) {
    await log("error", `Intervals connection failed: ${connection.error || "unknown error"}`);
    return;
  }

  const pull = await pullActuals({ initial: true });
  console.log(`[alpha] Intervals pull: ${pull.activities} activities, ${pull.wellness} wellness rows`);

  const syncSession = runSession ?? await prisma.scheduledSession.findFirst({
    where: {
      status: "PLANNED",
      date: { gte: parseAthleteDate(today), lte: parseAthleteDate(through) },
    },
    orderBy: { date: "asc" },
  });

  if (!syncSession) {
    await log("error", "No planned session available for Intervals upsert smoke test");
    return;
  }

  const sessionDate = dateKeyFromStored(syncSession.date);
  const firstPush = await pushPlan({ from: sessionDate, to: sessionDate });
  const afterFirst = await prisma.scheduledSession.findUnique({
    where: { id: syncSession.id },
    select: { intervalsEventId: true },
  });
  const firstEventId = afterFirst?.intervalsEventId ?? null;

  const secondPush = await pushPlan({ from: sessionDate, to: sessionDate });
  const afterSecond = await prisma.scheduledSession.findUnique({
    where: { id: syncSession.id },
    select: { intervalsEventId: true },
  });
  const secondEventId = afterSecond?.intervalsEventId ?? null;

  const idempotent = Boolean(firstEventId && secondEventId && firstEventId === secondEventId);
  console.log(`[alpha] Intervals push #1: ${firstPush.count}; push #2: ${secondPush.count}; stable event id: ${idempotent}`);

  await log(
    idempotent ? "ok" : "error",
    `Intervals alpha: pulled ${pull.activities} activities + ${pull.wellness} wellness; pushed ${firstPush.count}/${secondPush.count}; stable event id ${idempotent}`,
  );
}

main()
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[alpha] smoke failed: ${message}`);
    await log("error", `Alpha smoke failed: ${message}`);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
