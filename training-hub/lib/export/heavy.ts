import type { StrengthStructure } from "@/lib/validation/structures";

export const HEAVY_FORMAT = "workout-pwa-export";
export const HEAVY_SCHEMA_VERSION = 1;

export type HeavyExercise = {
  id: string;
  name: string;
  normalizedName: string;
  equipment: string;
  bodyArea: string;
  isBodyweight: boolean;
  aliases: string[];
  isCustom: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HeavySet = {
  id: string;
  setNumber: number;
  targetWeightKg: number;
  targetReps: number;
};

export type HeavyBlock = {
  id: string;
  exerciseId: string;
  order: number;
  notes: string;
  supersetGroupId?: string;
  supersetPosition?: number;
  supersetLabel?: string;
  sets: HeavySet[];
};

export type HeavyRoutine = {
  id: string;
  name: string;
  tag: string;
  notes: string;
  exerciseBlocks: HeavyBlock[];
  createdAt: string;
  updatedAt: string;
};

export type HeavyExport = {
  format: typeof HEAVY_FORMAT;
  schemaVersion: typeof HEAVY_SCHEMA_VERSION;
  appVersion: string;
  exportedAt: string;
  includesRecentHistory: boolean;
  exercises: HeavyExercise[];
  routines: HeavyRoutine[];
  sessions: [];
};

export function normaliseExerciseName(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseReps(reps: string) {
  const match = reps.match(/\d+/);
  return match ? Math.round(Number(match[0])) : 0;
}

function guessEquipment(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("barbell") || lower.includes("bench")) return "barbell";
  if (lower.includes("dumbbell") || lower.includes("db ")) return "dumbbell";
  if (lower.includes("kettlebell") || lower.includes("kb ")) return "kettlebell";
  if (lower.includes("cable")) return "cable";
  if (lower.includes("machine") || lower.includes("press")) return "machine";
  if (lower.includes("band")) return "band";
  if (lower.includes("push-up") || lower.includes("plank") || lower.includes("glide")) return "bodyweight";
  return "other";
}

function guessFamily(name: string, fallback?: string) {
  if (fallback) return fallback;
  const lower = name.toLowerCase();
  if (lower.includes("squat") || lower.includes("deadlift") || lower.includes("lunge") || lower.includes("rdl")) return "legs";
  if (lower.includes("bench") || lower.includes("press") || lower.includes("push")) return "push";
  if (lower.includes("row") || lower.includes("pull")) return "pull";
  if (lower.includes("shoulder") || lower.includes("raise")) return "shoulders";
  return "other";
}

export function encodeHeavy(
  structure: StrengthStructure,
  options: { name: string; now?: Date; exerciseIds?: Record<string, string> },
): HeavyExport {
  const now = (options.now ?? new Date()).toISOString();
  const exercises: HeavyExercise[] = [];
  const blocks: HeavyBlock[] = [];
  let order = 0;

  for (const group of structure.supersets) {
const groupId = structure.supersets.length > 0 && group.exercises.length > 1 ? crypto.randomUUID() : undefined;
    group.exercises.forEach((exercise, position) => {
      const id = options.exerciseIds?.[exercise.name] ?? `custom-${normaliseExerciseName(exercise.name).replace(/\s+/g, "-")}`;
      if (!exercises.some((item) => item.id === id)) {
        const equipment = guessEquipment(exercise.name);
        exercises.push({
          id,
          name: exercise.name,
          normalizedName: normaliseExerciseName(exercise.name),
          equipment,
          bodyArea: guessFamily(exercise.name, exercise.family),
          isBodyweight: equipment === "bodyweight",
          aliases: [],
          isCustom: !options.exerciseIds?.[exercise.name],
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        });
      }
      const targetReps = parseReps(exercise.reps);
      const targetWeightKg = Number(exercise.weightKg ?? 0);
      blocks.push({
        id: crypto.randomUUID(),
        exerciseId: id,
        order,
        notes: "",
        ...(groupId
          ? { supersetGroupId: groupId, supersetPosition: position, supersetLabel: group.label }
          : {}),
        sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
          id: crypto.randomUUID(),
          setNumber: setIndex + 1,
          targetWeightKg,
          targetReps,
        })),
      });
      order += 1;
    });
  }

  return {
    format: HEAVY_FORMAT,
    schemaVersion: HEAVY_SCHEMA_VERSION,
    appVersion: "bloody-daves-lift-log",
    exportedAt: now,
    includesRecentHistory: false,
    exercises,
    routines: [
      {
        id: crypto.randomUUID(),
        name: options.name,
        tag: "",
        notes: "Imported from Adaptive Fitness Training Hub",
        exerciseBlocks: blocks,
        createdAt: now,
        updatedAt: now,
      },
    ],
    sessions: [],
  };
}

export function assertHeavyImportable(envelope: HeavyExport) {
  if (envelope.format !== HEAVY_FORMAT) throw new Error("Unsupported export format.");
  if (envelope.schemaVersion !== HEAVY_SCHEMA_VERSION) throw new Error("Unsupported schema version.");
  if (!Array.isArray(envelope.routines) || envelope.routines.length === 0) throw new Error("No routines found.");
  for (const routine of envelope.routines) {
    if (!routine?.name || !Array.isArray(routine.exerciseBlocks)) {
      throw new Error("A routine is missing its name or exercise list.");
    }
    for (const block of routine.exerciseBlocks) {
      if (!block.exerciseId) throw new Error(`Routine “${routine.name}” contains an exercise without an ID.`);
      if (!Array.isArray(block.sets) || block.sets.length === 0) {
        throw new Error(`Routine “${routine.name}” contains an exercise with no sets.`);
      }
      for (const set of block.sets) {
        if (Number(set.targetWeightKg) < 0 || Number(set.targetReps) < 0) {
          throw new Error(`Routine “${routine.name}” contains invalid set values.`);
        }
      }
    }
  }
}
