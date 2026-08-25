import { describe, expect, it } from "vitest";
import { applyTaperToRun, applyTaperToStrength } from "@/lib/program/taper";
import { applySymptomFlags } from "@/lib/program/pyramid";
import { suggestProgression, weekNumber } from "@/lib/progression";
import { parseStructure } from "@/lib/validation/structures";
import { buildCoachContext } from "@/lib/coach/context";
import type { StrengthStructure } from "@/lib/validation/structures";

const strength: StrengthStructure = {
  supersets: [
    { label: "A", role: "strength", exercises: [{ name: "Barbell Bench Press", sets: 4, reps: "8", weightKg: 60 }] },
    { label: "B", role: "power", exercises: [{ name: "Push-Up", sets: 3, reps: "8" }] },
  ],
};

describe("deterministic program engine", () => {
  it("does not auto-apply progression", () => {
    const suggestions = suggestProgression({
      structure: strength,
      programStart: "2026-08-17",
      dateKey: "2026-09-08",
      completion: { completedAllReps: true, techniqueAccepted: true, rpe: 7 },
    });
    expect(weekNumber("2026-08-17", "2026-08-24")).toBe(2);
    expect(suggestions[0].applyable).toBe(true);
    expect(suggestions[0].suggestedKg).toBe(62.5);
    expect(strength.supersets[0].exercises[0].weightKg).toBe(60);
  });

  it("uses program taper percents rather than a hard-coded 35", () => {
    const reduced = applyTaperToStrength(strength, 50);
    expect(reduced.supersets[0].exercises[0].sets).toBe(2);
    const run = applyTaperToRun({
      warmupMin: 10,
      warmupPace: "easy",
      reps: 10,
      workSeconds: 60,
      workPace: "5:00/km",
      recoverySeconds: 60,
      recoveryPace: "easy",
    }, 50);
    expect(run.reps).toBe(5);
  });

  it("drops power first when a symptom flag is set", () => {
    const next = applySymptomFlags(strength, ["knee"]);
    expect(next.supersets.some((group) => group.role === "power")).toBe(false);
  });
});

describe("structure validation", () => {
  it("requires exactly one run work mechanism", () => {
    expect(() => parseStructure("RUN", {
      warmupMin: 10,
      warmupPace: "easy",
      reps: 5,
      workSeconds: 180,
      workKm: 1,
      workPace: "5:20/km",
      recoverySeconds: 90,
      recoveryPace: "easy",
    })).toThrow();
  });
});

describe("coach context", () => {
  it("emits the required markdown sections and labels stale FTP", () => {
    const markdown = buildCoachContext({
      programName: "Current block",
      todayKey: "2026-08-24",
      todaySessions: [{ modality: "STRENGTH", templateName: "Push A", status: "PLANNED" }],
      nextSeven: [],
      recentActivities: [],
      recentStrength: [],
      wellness: [],
      thresholds: { ftp: "144", ftpStale: true, rollingFtp: "186", lthr: "168", maxHr: "185" },
      unmatched: [],
    });
    for (const heading of [
      "CURRENT PROGRAM",
      "TODAY",
      "NEXT 7 DAYS",
      "RECENT COMPLETED ACTIVITIES",
      "RECENT STRENGTH SUMMARY",
      "WELLNESS SUMMARY",
      "CURRENT THRESHOLDS",
      "RECENT CHANGES",
      "UNMATCHED / MISSED SESSIONS",
      "USER NOTES",
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("Possibly stale");
  });
});
