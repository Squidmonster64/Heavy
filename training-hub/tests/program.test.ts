import { describe, expect, it } from "vitest";
import { generateDatedSessions } from "@/lib/program/generate";
import { snapshotStructure } from "@/lib/program/clone";
import type { StrengthStructure } from "@/lib/validation/structures";

const push: StrengthStructure = {
  supersets: [{ label: "A", exercises: [{ name: "Barbell Bench Press", sets: 3, reps: "8", weightKg: 60 }] }],
};

const days = [
  { dayOfWeek: 1, modality: "STRENGTH" as const, templateId: "push" },
  { dayOfWeek: 2, modality: "RUN" as const, templateId: "run" },
];

const templates = [
  { id: "push", name: "Push A", modality: "STRENGTH" as const, structure: push },
  {
    id: "run",
    name: "Threshold",
    modality: "RUN" as const,
    structure: {
      warmupMin: 10,
      warmupPace: "6:00/km",
      reps: 5,
      workSeconds: 180,
      workPace: "5:20/km",
      recoverySeconds: 90,
      recoveryPace: "easy",
    },
  },
];

describe("program generation", () => {
  it("creates dated sessions for a 6 week horizon without Sunday work", () => {
    const generated = generateDatedSessions({
      programId: "p1",
      startDate: "2026-08-17",
      days,
      templates,
      existing: [],
      fromDate: "2026-08-17",
    });
    expect(generated.length).toBeGreaterThan(0);
    expect(generated.every((session) => session.date >= "2026-08-17")).toBe(true);
    expect(generated.some((session) => session.date === "2026-08-23")).toBe(false);
    expect(generated.filter((session) => session.date === "2026-08-24" && session.modality === "STRENGTH")).toHaveLength(1);
  });

  it("does not duplicate on regeneration", () => {
    const first = generateDatedSessions({
      programId: "p1",
      startDate: "2026-08-17",
      days,
      templates,
      existing: [],
      fromDate: "2026-08-17",
    });
    const second = generateDatedSessions({
      programId: "p1",
      startDate: "2026-08-17",
      days,
      templates,
      existing: first.map((session) => ({
        programId: "p1",
        date: session.date,
        modality: session.modality,
        templateId: session.templateId,
      })),
      fromDate: "2026-08-17",
    });
    expect(second).toEqual([]);
  });

  it("snapshots prescriptions so later template edits do not rewrite history", () => {
    const generated = generateDatedSessions({
      programId: "p1",
      startDate: "2026-08-17",
      days,
      templates,
      existing: [],
      fromDate: "2026-08-24",
    });
    const monday = generated.find((session) => session.date === "2026-08-24" && session.modality === "STRENGTH");
    const snapshot = snapshotStructure(monday?.plannedStructure) as StrengthStructure;
    const mutated = snapshotStructure(push) as StrengthStructure;
    mutated.supersets[0].exercises[0].weightKg = 62.5;
    expect(snapshot.supersets[0].exercises[0].weightKg).toBe(60);
    expect(mutated.supersets[0].exercises[0].weightKg).toBe(62.5);
  });

  it("selects nerve-glide stage templates by date", () => {
    const generated = generateDatedSessions({
      programId: "p1",
      startDate: "2026-08-17",
      days: [{ dayOfWeek: 1, modality: "REHAB", templateId: "old" }],
      templates: [
        { id: "old", name: "Old", modality: "REHAB", structure: { rounds: 1, blocks: [{ name: "Old", seconds: 10 }] } },
        { id: "stage1", name: "Stage 1", modality: "REHAB", structure: { rounds: 1, blocks: [{ name: "Stage 1", seconds: 45 }] } },
      ],
      existing: [],
      fromDate: "2026-08-24",
      config: {
        nerveGlideStages: [{ stage: 1, start: "2026-08-14", end: "2026-08-26", templateId: "stage1" }],
      },
    });
    const rehab = generated.find((session) => session.date === "2026-08-24" && session.modality === "REHAB");
    expect(rehab?.templateId).toBe("stage1");
  });
});
