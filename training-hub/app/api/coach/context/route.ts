import { NextResponse } from "next/server";
import { unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { addDays, dateKeyFromStored, todayAthleteDateKey } from "@/lib/dates";
import { buildCoachContext } from "@/lib/coach/context";
import { SETTING_KEYS, getSettingsMap } from "@/lib/settings";
import { getActiveProgram } from "@/lib/program/service";

export async function GET() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const today = todayAthleteDateKey();
  const program = await getActiveProgram();
  const sessions = await prisma.scheduledSession.findMany({
    where: {
      date: { gte: new Date(`${today}T00:00:00.000Z`), lte: new Date(`${addDays(today, 7)}T00:00:00.000Z`) },
    },
    orderBy: { date: "asc" },
  });
  const settings = await getSettingsMap(Object.values(SETTING_KEYS));
  const wellness = await prisma.wellnessSnapshot.findMany({ orderBy: { date: "desc" }, take: 7 });
  const activities = await prisma.pulledActivity.findMany({ orderBy: { date: "desc" }, take: 10 });
  const markdown = buildCoachContext({
    programName: program?.name,
    todayKey: today,
    todaySessions: sessions.filter((session) => dateKeyFromStored(session.date) === today).map((session) => ({
      modality: session.modality,
      templateName: session.templateName,
      status: session.status,
      matchStatus: session.matchStatus,
    })),
    nextSeven: sessions.map((session) => ({
      date: dateKeyFromStored(session.date),
      modality: session.modality,
      templateName: session.templateName,
      status: session.status,
    })),
    recentActivities: activities.map((activity) => ({
      date: dateKeyFromStored(activity.date),
      name: activity.name,
      type: activity.type,
      durationSec: activity.durationSec,
    })),
    recentStrength: sessions.filter((session) => session.modality === "STRENGTH").map((session) => ({
      date: dateKeyFromStored(session.date),
      name: session.templateName,
      status: session.status,
    })),
    wellness: wellness.map((row) => ({ date: dateKeyFromStored(row.date), raw: row.raw })),
    thresholds: {
      ftp: settings[SETTING_KEYS.ftp],
      ftpStale: settings[SETTING_KEYS.ftpStale] !== "false",
      rollingFtp: settings[SETTING_KEYS.rollingFtp],
      lthr: settings[SETTING_KEYS.lthr],
      maxHr: settings[SETTING_KEYS.maxHr],
    },
    unmatched: sessions
      .filter((session) => session.matchStatus !== "AUTO_MATCHED" && session.matchStatus !== "MANUAL_MATCHED")
      .map((session) => ({
        date: dateKeyFromStored(session.date),
        templateName: session.templateName,
        matchStatus: session.matchStatus,
      })),
  });
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"claude_input.md\"",
    },
  });
}
