import type { StrengthStructure } from "@/lib/validation/structures";
import { clone } from "@/lib/program/clone";

export type ProgressionSuggestion = {
  name: string;
  currentKg: number | null;
  suggestedKg: number | null;
  reason: string;
  applyable: boolean;
};

const UPPER = /bench|press|row|pull|chin|curl|raise|ohp|overhead|fly|push/i;
const LOWER = /squat|deadlift|lunge|rdl|leg|hip|calf|bridge/i;

function incrementFor(name: string) {
  if (LOWER.test(name) && !UPPER.test(name)) return 5;
  return 2.5;
}

export type CompletionFlags = {
  completedAllReps?: boolean;
  techniqueAccepted?: boolean;
  failureFlag?: boolean;
  rpe?: number;
};

export function weekNumber(programStart: string, dateKey: string) {
  const start = Date.parse(`${programStart}T00:00:00.000Z`);
  const date = Date.parse(`${dateKey}T00:00:00.000Z`);
  const days = Math.floor((date - start) / 86_400_000);
  return Math.floor(days / 7) + 1;
}

export function suggestProgression(options: {
  structure: StrengthStructure;
  programStart: string;
  dateKey: string;
  completion?: CompletionFlags | null;
}): ProgressionSuggestion[] {
  const week = weekNumber(options.programStart, options.dateKey);
  const suggestions: ProgressionSuggestion[] = [];
  for (const group of options.structure.supersets) {
    for (const exercise of group.exercises) {
      const current = exercise.weightKg ?? null;
      if (week <= 2) {
        suggestions.push({
          name: exercise.name,
          currentKg: current,
          suggestedKg: current != null ? Number((current * 0.8).toFixed(1)) : null,
          reason: "Weeks 1–2: ~80% prior working load, technique focus, RPE 6–7",
          applyable: false,
        });
        continue;
      }
      const completion = options.completion ?? {};
      const eligible =
        completion.completedAllReps === true &&
        completion.techniqueAccepted !== false &&
        completion.failureFlag !== true &&
        (completion.rpe == null || (completion.rpe >= 6 && completion.rpe <= 8));
      const suggested = current != null ? current + incrementFor(exercise.name) : null;
      suggestions.push({
        name: exercise.name,
        currentKg: current,
        suggestedKg: eligible ? suggested : current,
        reason: eligible
          ? "Completed as prescribed with acceptable RPE — increase is available"
          : "Keep current load until the recorded session supports progression",
        applyable: Boolean(eligible && suggested != null && suggested !== current),
      });
    }
  }
  return suggestions;
}

export function applyExerciseWeight(structure: StrengthStructure, name: string, weightKg: number): StrengthStructure {
  const next = clone(structure);
  for (const group of next.supersets) {
    for (const exercise of group.exercises) {
      if (exercise.name === name) exercise.weightKg = weightKg;
    }
  }
  return next;
}
