import { Shell } from "../shell";
import { ProgramBuilder } from "./builder";
import { prisma } from "@/lib/db";
import { dateKeyFromStored } from "@/lib/dates";
import { getActiveProgram } from "@/lib/program/service";

export const dynamic = "force-dynamic";

export default async function ProgramPage() {
  const program = await getActiveProgram();
  const templates = await prisma.sessionTemplate.findMany({ orderBy: { name: "asc" } });
  const sessions = program
    ? await prisma.scheduledSession.findMany({
        where: { programId: program.id },
        orderBy: { date: "asc" },
      })
    : [];
  return (
    <Shell>
      <p className="kicker">Program builder</p>
      <h2 className="mt-1 text-3xl">Calendar</h2>
      <p className="muted font-sans text-sm mb-4">Edit this session vs edit template for future sessions are separate actions.</p>
      <ProgramBuilder
        program={program ? {
          id: program.id,
          name: program.name,
          startDate: dateKeyFromStored(program.startDate),
          taperStart: program.taperStart ? dateKeyFromStored(program.taperStart) : null,
          raceDate: program.raceDate ? dateKeyFromStored(program.raceDate) : null,
          config: program.config,
          days: program.days,
        } : null}
        templates={templates}
        sessions={sessions.map((session) => ({
          id: session.id,
          date: dateKeyFromStored(session.date),
          modality: session.modality,
          templateName: session.templateName,
          status: session.status,
        }))}
      />
    </Shell>
  );
}
