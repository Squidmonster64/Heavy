import type { CycleStructure, Modality, RehabStructure, RunStructure, StrengthStructure } from "@/lib/validation/structures";

function paceLine(label: string, duration: string, pace: string) {
  if (/easy/i.test(pace)) return `${duration} easy`;
  return `${duration} @ ${pace.replace(/\/km$/i, "/km")}`;
}

function formatMinutes(seconds: number) {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const remain = whole % 60;
  if (minutes && remain) return `${minutes}m${remain ? remain : ""}`;
  if (minutes) return `${minutes}m`;
  return `${remain}s`;
}

export function describeRun(structure: RunStructure, name: string) {
  const work = structure.workKm != null ? `${structure.workKm}km` : formatMinutes(structure.workSeconds ?? 0);
  const recovery = formatMinutes(structure.recoverySeconds);
  const warmup = `${structure.warmupMin}m`;
  const cooldown = `${structure.cooldownMin ?? 10}m`;
  return [
    name,
    paceLine("warmup", warmup, structure.warmupPace),
    `${structure.reps}x`,
    `- ${paceLine("work", work, structure.workPace)}`,
    `- ${paceLine("recovery", recovery, structure.recoveryPace)}`,
    paceLine("cooldown", cooldown, "easy"),
  ].join("\n");
}

export function describeRehab(structure: RehabStructure, name: string) {
  const blocks = structure.blocks.map((block) => `- ${block.name}: ${block.seconds}s`).join("\n");
  return `${name}\n${structure.rounds} rounds\n${blocks}`;
}

export function describeStrength(structure: StrengthStructure, name: string) {
  const lines = structure.supersets.flatMap((group) => {
    const header = `Superset ${group.label}`;
    const exercises = group.exercises.map((exercise) => {
      const load = exercise.weightKg != null ? ` @ ${exercise.weightKg} kg` : "";
      return `- ${exercise.name} ${exercise.sets} × ${exercise.reps}${load}`;
    });
    return [header, ...exercises];
  });
  return [name, ...lines].join("\n");
}

export function describeCycle(structure: CycleStructure, name: string) {
  return [name, `Ride`, `${structure.durationMin} min`, structure.zone, structure.note].filter(Boolean).join("\n");
}

export function intervalsTypeFor(modality: Modality) {
  switch (modality) {
    case "RUN":
      return "Run";
    case "CYCLE":
      return "Ride";
    case "STRENGTH":
      return "WeightTraining";
    case "REHAB":
      return "Other";
  }
}

export function describeSession(modality: Modality, name: string, structure: unknown) {
  if (modality === "RUN") return describeRun(structure as RunStructure, name);
  if (modality === "CYCLE") return describeCycle(structure as CycleStructure, name);
  if (modality === "STRENGTH") return describeStrength(structure as StrengthStructure, name);
  return describeRehab(structure as RehabStructure, name);
}
