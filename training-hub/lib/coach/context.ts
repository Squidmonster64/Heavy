import { dateKeyFromStored, formatAthleteLong, todayAthleteDateKey } from "@/lib/dates";
import type { Modality } from "@/lib/validation/structures";

export type CoachContextInput = {
  programName?: string | null;
  todayKey?: string;
  todaySessions: Array<{
    modality: Modality;
    templateName?: string | null;
    status: string;
    matchStatus?: string | null;
  }>;
  nextSeven: Array<{
    date: string;
    modality: Modality;
    templateName?: string | null;
    status: string;
  }>;
  recentActivities: Array<{
    date: string;
    name?: string | null;
    type?: string | null;
    durationSec?: number | null;
  }>;
  recentStrength: Array<{
    date: string;
    name?: string | null;
    status: string;
  }>;
  wellness: Array<{
    date: string;
    raw: unknown;
  }>;
  thresholds: {
    ftp?: string | null;
    ftpStale?: boolean;
    rollingFtp?: string | null;
    lthr?: string | null;
    maxHr?: string | null;
  };
  recentChanges?: string[];
  unmatched: Array<{ date: string; templateName?: string | null; matchStatus?: string | null }>;
  notes?: string | null;
};

function section(title: string, lines: string[]) {
  return [`## ${title}`, ...lines, ""].join("\n");
}

export function buildCoachContext(input: CoachContextInput) {
  const today = input.todayKey ?? todayAthleteDateKey();
  const ftpLine = input.thresholds.ftp
    ? `FTP: ${input.thresholds.ftp} W${input.thresholds.ftpStale ? " (Possibly stale)" : ""}`
    : "FTP: not set";
  return [
    "# Training Hub coach context",
    `Generated: ${new Date().toISOString()}`,
    `Athlete timezone: Australia/Perth`,
    "",
    section("CURRENT PROGRAM", [
      input.programName ? `- ${input.programName}` : "- No active program",
    ]),
    section("TODAY", [
      `- ${formatAthleteLong(today)}`,
      ...(input.todaySessions.length
        ? input.todaySessions.map((session) => `- ${session.modality} ${session.templateName ?? ""} (${session.status}${session.matchStatus && session.matchStatus !== "UNMATCHED" ? `, ${session.matchStatus}` : ""})`)
        : ["- Rest / no sessions scheduled"]),
    ]),
    section("NEXT 7 DAYS", [
      ...(input.nextSeven.length
        ? input.nextSeven.map((session) => `- ${session.date} ${session.modality} ${session.templateName ?? ""} (${session.status})`)
        : ["- None"]),
    ]),
    section("RECENT COMPLETED ACTIVITIES", [
      ...(input.recentActivities.length
        ? input.recentActivities.map((activity) => `- ${activity.date} ${activity.type ?? ""} ${activity.name ?? ""} ${activity.durationSec ? `${Math.round(activity.durationSec / 60)} min` : ""}`.trim())
        : ["- None stored"]),
    ]),
    section("RECENT STRENGTH SUMMARY", [
      ...(input.recentStrength.length
        ? input.recentStrength.map((session) => `- ${session.date} ${session.name ?? "Strength"} (${session.status})`)
        : ["- None. Lift Log remains canonical for actual sets."]),
    ]),
    section("WELLNESS SUMMARY", [
      ...(input.wellness.length
        ? input.wellness.map((row) => {
            const raw = row.raw && typeof row.raw === "object" ? row.raw as Record<string, unknown> : {};
            const parts = ["restingHR", "hrv", "sleepSecs", "weight", "ctl", "atl"]
              .filter((key) => raw[key] != null)
              .map((key) => `${key}=${String(raw[key])}`);
            return `- ${row.date}${parts.length ? `: ${parts.join(", ")}` : ": payload stored, no interpreted fields"}`;
          })
        : ["- No wellness snapshots"]),
    ]),
    section("CURRENT THRESHOLDS", [
      `- ${ftpLine}`,
      `- Rolling FTP estimate: ${input.thresholds.rollingFtp ?? "not set"}`,
      `- LTHR: ${input.thresholds.lthr ?? "not set"}`,
      `- Max HR: ${input.thresholds.maxHr ?? "not set"}`,
    ]),
    section("RECENT CHANGES", input.recentChanges?.length ? input.recentChanges.map((line) => `- ${line}`) : ["- None recorded"]),
    section("UNMATCHED / MISSED SESSIONS", [
      ...(input.unmatched.length
        ? input.unmatched.map((session) => `- ${session.date} ${session.templateName ?? ""} (${session.matchStatus ?? "UNMATCHED"})`)
        : ["- None"]),
    ]),
    section("USER NOTES", [input.notes ? input.notes : "- None"]),
  ].join("\n");
}

export function wellnessDateKey(value: Date | string) {
  return typeof value === "string" ? value.slice(0, 10) : dateKeyFromStored(value);
}
