import { prisma } from "@/lib/db";
import { DEFAULT_HORIZON_WEEKS } from "@/lib/config";
import { dateKeyFromStored, parseAthleteDate, todayAthleteDateKey } from "@/lib/dates";
import { generateDatedSessions } from "@/lib/program/generate";
import { parseSymptomFlags } from "@/lib/settings";
import { SETTING_KEYS, getSetting } from "@/lib/settings";
import { externalIdForSession } from "@/lib/intervals/client";
import { createId } from "./id";

export async function getActiveProgram() {
  return prisma.program.findFirst({
    where: { active: true },
    include: { days: { include: { template: true } }, sessions: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function generateProgramSessions(programId: string, fromDate?: string) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { days: true, sessions: true },
  });
  if (!program) throw new Error("Program not found");
  const templates = await prisma.sessionTemplate.findMany();
  const flags = parseSymptomFlags(await getSetting(SETTING_KEYS.symptomFlags));
  const generated = generateDatedSessions({
    programId: program.id,
    startDate: dateKeyFromStored(program.startDate),
    horizonWeeks: DEFAULT_HORIZON_WEEKS,
    days: program.days,
    templates,
    existing: program.sessions.map((session) => ({
      programId: session.programId,
      date: dateKeyFromStored(session.date),
      modality: session.modality,
      templateId: session.templateId,
    })),
    config: program.config,
    taperStart: program.taperStart ? dateKeyFromStored(program.taperStart) : null,
    symptomFlagsByDate: flags,
    fromDate: fromDate ?? todayAthleteDateKey(),
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
  return generated.length;
}
