import { PrismaClient, type Modality } from "@prisma/client";
import { DEFAULT_PROGRAM_CONFIG } from "../lib/config";
import { generateDatedSessions } from "../lib/program/generate";
import { externalIdForSession } from "../lib/intervals/client";
import { createId } from "../lib/program/id";
import { parseAthleteDate } from "../lib/dates";

const prisma = new PrismaClient();

const LIFT_LOG_EXERCISES: Array<[string, string, string, string, boolean]> = [
  ["bodyweight-squat", "Bodyweight Squat", "bodyweight", "legs", true],
  ["split-squat-bw", "Split Squat", "bodyweight", "legs", true],
  ["reverse-lunge-bw", "Reverse Lunge", "bodyweight", "legs", true],
  ["forward-lunge-bw", "Forward Lunge", "bodyweight", "legs", true],
  ["step-up-bw", "Step-Up", "bodyweight", "legs", true],
  ["single-leg-squat-box", "Single-Leg Box Squat", "bodyweight", "legs", true],
  ["calf-raise-bw", "Calf Raise", "bodyweight", "legs", true],
  ["glute-bridge", "Glute Bridge", "bodyweight", "legs", true],
  ["single-leg-glute-bridge", "Single-Leg Glute Bridge", "bodyweight", "legs", true],
  ["wall-sit", "Wall Sit", "bodyweight", "legs", true],
  ["push-up", "Push-Up", "bodyweight", "push", true],
  ["incline-push-up", "Incline Push-Up", "bodyweight", "push", true],
  ["chair-dip", "Chair Dip", "bodyweight", "arms", true],
  ["pull-up", "Pull-Up", "bodyweight", "pull", true],
  ["chin-up", "Chin-Up", "bodyweight", "pull", true],
  ["inverted-row", "Inverted Row", "bodyweight", "pull", true],
  ["plank", "Plank", "bodyweight", "core", true],
  ["side-plank", "Side Plank", "bodyweight", "core", true],
  ["dead-bug", "Dead Bug", "bodyweight", "core", true],
  ["bird-dog", "Bird Dog", "bodyweight", "core", true],
  ["goblet-squat-kb", "Goblet Squat — Kettlebell", "kettlebell", "legs", false],
  ["kb-swing", "Kettlebell Swing", "kettlebell", "full-body", false],
  ["kb-deadlift", "Kettlebell Deadlift", "kettlebell", "legs", false],
  ["db-bench-press", "Dumbbell Bench Press", "dumbbell", "push", false],
  ["incline-db-press", "Incline Dumbbell Press", "dumbbell", "push", false],
  ["one-arm-db-row", "One-Arm Dumbbell Row", "dumbbell", "pull", false],
  ["db-shoulder-press", "Dumbbell Shoulder Press", "dumbbell", "shoulders", false],
  ["db-rdl", "Dumbbell Romanian Deadlift", "dumbbell", "legs", false],
  ["db-lunge", "Dumbbell Lunge", "dumbbell", "legs", false],
  ["barbell-back-squat", "Barbell Back Squat", "barbell", "legs", false],
  ["barbell-deadlift", "Barbell Deadlift", "barbell", "legs", false],
  ["barbell-bench-press", "Barbell Bench Press", "barbell", "push", false],
  ["barbell-row", "Barbell Row", "barbell", "pull", false],
  ["barbell-overhead-press", "Barbell Overhead Press", "barbell", "shoulders", false],
  ["lat-pulldown", "Lat Pulldown", "cable", "pull", false],
  ["seated-cable-row", "Seated Cable Row", "cable", "pull", false],
  ["band-row", "Resistance Band Row", "band", "pull", false],
  ["band-pull-apart", "Band Pull-Apart", "band", "shoulders", false],
  ["band-external-rotation", "Band External Rotation", "band", "rehabilitation", false],
  ["clamshell", "Clamshell", "band", "rehabilitation", false],
  ["terminal-knee-extension", "Terminal Knee Extension", "band", "rehabilitation", false],
  ["hip-flexor-stretch", "Hip Flexor Stretch", "other", "mobility", true],
  ["thoracic-rotation", "Thoracic Rotation", "other", "mobility", true],
  ["ankle-mobility", "Ankle Mobility", "other", "mobility", true],
];

const FLAGS: Record<string, { kneeFlag?: string; shoulderFlag?: string; spineFlag?: string }> = {
  "terminal-knee-extension": { kneeFlag: "knee" },
  "band-external-rotation": { shoulderFlag: "shoulder" },
};

function rehab(seconds: number, extra: string) {
  return {
    rounds: 1,
    blocks: [
      { name: "Nerve glide", seconds },
      { name: extra, seconds: 30 },
    ],
  };
}

async function main() {
  const exerciseCount = await prisma.exerciseLibrary.count();
  if (exerciseCount === 0) {
    await prisma.exerciseLibrary.createMany({
      data: LIFT_LOG_EXERCISES.map(([id, name, equipment, family]) => ({
        id,
        name,
        family,
        equipment,
        cues: null,
        ...FLAGS[id],
      })),
    });
  }

  const settings: Array<[string, string]> = [
    ["intervals.athleteId", process.env.INTERVALS_ATHLETE_ID || "i568864"],
    ["thresholds.ftp", "144"],
    ["thresholds.ftpStale", "true"],
    ["thresholds.rollingFtp", "186"],
    ["thresholds.lthr", "168"],
    ["thresholds.maxHr", "185"],
    ["taper.defaultPct", "35"],
    ["athlete.timezone", "Australia/Perth"],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  if (await prisma.program.count()) return;

  const stage = async (n: number, seconds: number) =>
    prisma.sessionTemplate.create({
      data: { name: `Nerve Glide — Stage ${n}`, modality: "REHAB", structure: rehab(seconds, "Rest") },
    });

  const s1 = await stage(1, 45);
  const s2 = await stage(2, 50);
  const s3 = await stage(3, 55);
  const s4 = await stage(4, 60);

  const push = await prisma.sessionTemplate.create({
    data: {
      name: "Push A",
      modality: "STRENGTH",
      structure: {
        supersets: [
          {
            label: "A",
            role: "strength",
            exercises: [{ name: "Barbell Bench Press", sets: 3, reps: "8", weightKg: 60, family: "push" }],
          },
          {
            label: "B",
            role: "strength",
            exercises: [{ name: "Barbell Row", sets: 3, reps: "8", weightKg: 60, family: "pull" }],
          },
          {
            label: "C",
            role: "power",
            exercises: [{ name: "Push-Up", sets: 3, reps: "8", family: "push" }],
          },
        ],
      },
    },
  });

  const lower = await prisma.sessionTemplate.create({
    data: {
      name: "Lower A",
      modality: "STRENGTH",
      structure: {
        supersets: [
          {
            label: "A",
            role: "durability",
            exercises: [{ name: "Goblet Squat — Kettlebell", sets: 3, reps: "8", weightKg: 24, family: "legs" }],
          },
          {
            label: "B",
            role: "strength",
            exercises: [{ name: "Dumbbell Romanian Deadlift", sets: 3, reps: "8", weightKg: 24, family: "legs" }],
          },
        ],
      },
    },
  });

  const threshold = await prisma.sessionTemplate.create({
    data: {
      name: "5 × 3 min Threshold",
      modality: "RUN",
      structure: {
        warmupMin: 10,
        warmupPace: "5:45-6:10/km",
        reps: 5,
        workSeconds: 180,
        workPace: "5:20-5:30/km",
        recoverySeconds: 90,
        recoveryPace: "easy",
        cooldownMin: 10,
      },
    },
  });

  const ride = await prisma.sessionTemplate.create({
    data: {
      name: "Z2 Ride",
      modality: "CYCLE",
      structure: { durationMin: 60, zone: "Z2", note: "Steady aerobic. No Rouvy integration in v1." },
    },
  });

  const config = {
    ...DEFAULT_PROGRAM_CONFIG,
    nerveGlideStages: [
      { stage: 1, start: "2026-08-14", end: "2026-08-26", templateId: s1.id },
      { stage: 2, start: "2026-08-28", end: "2026-09-09", templateId: s2.id },
      { stage: 3, start: "2026-09-11", end: "2026-09-23", templateId: s3.id },
      { stage: 4, start: "2026-09-25", end: "2026-10-07", templateId: s4.id },
    ],
  };

  const program = await prisma.program.create({
    data: {
      name: "Current block",
      startDate: parseAthleteDate("2026-08-17"),
      raceDate: null,
      taperStart: null,
      config,
      days: {
        create: [
          { dayOfWeek: 1, modality: "REHAB" as Modality, templateId: s1.id },
          { dayOfWeek: 1, modality: "STRENGTH" as Modality, templateId: push.id },
          { dayOfWeek: 2, modality: "RUN" as Modality, templateId: threshold.id },
          { dayOfWeek: 3, modality: "REHAB" as Modality, templateId: s1.id },
          { dayOfWeek: 4, modality: "STRENGTH" as Modality, templateId: lower.id },
          { dayOfWeek: 5, modality: "REHAB" as Modality, templateId: s1.id },
          { dayOfWeek: 5, modality: "RUN" as Modality, templateId: threshold.id },
          { dayOfWeek: 6, modality: "CYCLE" as Modality, templateId: ride.id },
        ],
      },
    },
    include: { days: true },
  });

  const templates = await prisma.sessionTemplate.findMany();
  const generated = generateDatedSessions({
    programId: program.id,
    startDate: "2026-08-17",
    days: program.days,
    templates,
    existing: [],
    config,
    fromDate: "2026-08-17",
  });
  for (const session of generated) {
    const id = createId();
    await prisma.scheduledSession.create({
      data: {
        id,
        programId: program.id,
        date: parseAthleteDate(session.date),
        modality: session.modality,
        templateId: session.templateId,
        templateName: session.templateName,
        plannedStructure: session.plannedStructure as object,
        originalStructure: session.originalStructure as object | undefined,
        intervalsExternalId: externalIdForSession(id),
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
