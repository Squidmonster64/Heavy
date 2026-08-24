import { describe, expect, it } from "vitest";
import { assertHeavyImportable, encodeHeavy, HEAVY_FORMAT } from "@/lib/export/heavy";
import known from "./fixtures/lift-log-known-good.json";

describe("Lift Log encoder", () => {
  it("matches the current production import schema", () => {
    const envelope = encodeHeavy(
      {
        supersets: [
          {
            label: "A",
            exercises: [
              { name: "Barbell Bench Press", sets: 3, reps: "8", weightKg: 60 },
              { name: "Barbell Row", sets: 3, reps: "8", weightKg: 60 },
            ],
          },
        ],
      },
      { name: "Push A", now: new Date("2026-08-24T00:00:00.000Z"), exerciseIds: { "Barbell Bench Press": "barbell-bench-press" } },
    );
    assertHeavyImportable(envelope);
    expect(envelope.format).toBe(HEAVY_FORMAT);
    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.includesRecentHistory).toBe(false);
    expect(envelope.routines[0].name).toBe("Push A");
    expect(envelope.routines[0].exerciseBlocks[0].exerciseId).toBe("barbell-bench-press");
    expect(envelope.routines[0].exerciseBlocks[0].sets).toHaveLength(3);
    expect(envelope.routines[0].exerciseBlocks[0].sets[0].targetWeightKg).toBe(60);
    expect(envelope.routines[0].exerciseBlocks[0].sets[0].targetReps).toBe(8);
    expect(envelope.sessions).toEqual([]);
    expect(known.format).toBe(HEAVY_FORMAT);
    expect(known.schemaVersion).toBe(1);
    expect(Array.isArray(known.routines)).toBe(true);
    expect(known.routines[0].exerciseBlocks[0].sets[0].targetReps).toBeGreaterThan(0);
  });
});
