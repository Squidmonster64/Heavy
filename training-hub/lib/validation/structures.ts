import { z } from "zod";

export const modalitySchema = z.enum(["REHAB", "STRENGTH", "RUN", "CYCLE"]);
export type Modality = z.infer<typeof modalitySchema>;

export const rehabStructureSchema = z.object({
  blocks: z.array(z.object({
    name: z.string().min(1),
    seconds: z.number().positive(),
  })).min(1),
  rounds: z.number().int().positive(),
});
export type RehabStructure = z.infer<typeof rehabStructureSchema>;

const strengthExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.string().min(1),
  weightKg: z.number().nonnegative().optional(),
  family: z.string().optional(),
  role: z.enum(["durability", "cardio", "strength", "power"]).optional(),
});

export const strengthStructureSchema = z.object({
  supersets: z.array(z.object({
    label: z.string().min(1),
    role: z.enum(["durability", "cardio", "strength", "power"]).optional(),
    exercises: z.array(strengthExerciseSchema).min(1),
  })).min(1),
});
export type StrengthStructure = z.infer<typeof strengthStructureSchema>;

export const runStructureSchema = z.object({
  warmupMin: z.number().nonnegative(),
  warmupPace: z.string().min(1),
  reps: z.number().int().positive(),
  workSeconds: z.number().positive().optional(),
  workKm: z.number().positive().optional(),
  workPace: z.string().min(1),
  recoverySeconds: z.number().nonnegative(),
  recoveryPace: z.string().min(1),
  cooldownMin: z.number().nonnegative().optional(),
}).superRefine((value, ctx) => {
  const hasTime = value.workSeconds != null;
  const hasDistance = value.workKm != null;
  if (hasTime === hasDistance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exactly one of workSeconds or workKm is required",
      path: hasTime ? ["workSeconds"] : ["workKm"],
    });
  }
});
export type RunStructure = z.infer<typeof runStructureSchema>;

export const cycleStructureSchema = z.object({
  durationMin: z.number().positive(),
  zone: z.enum(["Z1", "Z2"]),
  note: z.string().optional(),
});
export type CycleStructure = z.infer<typeof cycleStructureSchema>;

export type SessionStructure =
  | { modality: "REHAB"; structure: RehabStructure }
  | { modality: "STRENGTH"; structure: StrengthStructure }
  | { modality: "RUN"; structure: RunStructure }
  | { modality: "CYCLE"; structure: CycleStructure };

export function parseStructure(modality: Modality, raw: unknown) {
  switch (modality) {
    case "REHAB":
      return rehabStructureSchema.parse(raw);
    case "STRENGTH":
      return strengthStructureSchema.parse(raw);
    case "RUN":
      return runStructureSchema.parse(raw);
    case "CYCLE":
      return cycleStructureSchema.parse(raw);
  }
}

export function estimatedMinutes(modality: Modality, raw: unknown): number | null {
  try {
    if (modality === "REHAB") {
      const structure = rehabStructureSchema.parse(raw);
      const blockSeconds = structure.blocks.reduce((sum, block) => sum + block.seconds, 0);
      return Math.round((blockSeconds * structure.rounds) / 60);
    }
    if (modality === "STRENGTH") {
      const structure = strengthStructureSchema.parse(raw);
      const sets = structure.supersets.flatMap((group) => group.exercises).reduce((sum, exercise) => sum + exercise.sets, 0);
      return Math.max(20, sets * 3);
    }
    if (modality === "RUN") {
      const structure = runStructureSchema.parse(raw);
      const work = structure.workSeconds ?? (structure.workKm ? structure.workKm * 300 : 0);
      const cooldown = (structure.cooldownMin ?? 10) * 60;
      return Math.round((structure.warmupMin * 60 + structure.reps * (work + structure.recoverySeconds) + cooldown) / 60);
    }
    const structure = cycleStructureSchema.parse(raw);
    return Math.round(structure.durationMin);
  } catch {
    return null;
  }
}
