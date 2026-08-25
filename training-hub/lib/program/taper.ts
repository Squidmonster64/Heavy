import { clone } from "./clone";
import type { RunStructure, StrengthStructure } from "@/lib/validation/structures";

export type TaperConfig = {
  enabled: boolean;
  strengthVolumeReductionPct: number;
  runVolumeReductionPct: number;
};

export function isTaperDate(dateKey: string, taperStart?: string | null, enabled = true) {
  if (!enabled || !taperStart) return false;
  return dateKey >= taperStart;
}

export function applyTaperToStrength(structure: StrengthStructure, pct: number): StrengthStructure {
  const factor = Math.max(0, 1 - pct / 100);
  const next = clone(structure);
  for (const group of next.supersets) {
    for (const exercise of group.exercises) {
      exercise.sets = Math.max(1, Math.round(exercise.sets * factor));
    }
  }
  return next;
}

export function applyTaperToRun(structure: RunStructure, pct: number): RunStructure {
  const factor = Math.max(0, 1 - pct / 100);
  const next = clone(structure);
  if (next.workSeconds != null) next.workSeconds = Math.max(1, Math.round(next.workSeconds * factor));
  if (next.workKm != null) next.workKm = Number((next.workKm * factor).toFixed(2));
  next.reps = Math.max(1, Math.round(next.reps * factor));
  return next;
}
