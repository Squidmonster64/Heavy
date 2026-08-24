import { NextRequest, NextResponse } from "next/server";
import { fail, unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseAthleteDate } from "@/lib/dates";
import { generateProgramSessions } from "@/lib/program/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const { id } = await params;
  const program = await prisma.program.findUnique({ where: { id }, include: { days: true } });
  if (!program) return fail(404, "Program not found");
  return NextResponse.json({ program });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const program = await prisma.program.update({
    where: { id },
    data: {
      name: body.name != null ? String(body.name) : undefined,
      startDate: body.startDate ? parseAthleteDate(String(body.startDate)) : undefined,
      endDate: body.endDate === null ? null : body.endDate ? parseAthleteDate(String(body.endDate)) : undefined,
      taperStart: body.taperStart === null ? null : body.taperStart ? parseAthleteDate(String(body.taperStart)) : undefined,
      raceDate: body.raceDate === null ? null : body.raceDate ? parseAthleteDate(String(body.raceDate)) : undefined,
      config: body.config,
      active: body.active != null ? Boolean(body.active) : undefined,
    },
  });
  if (Array.isArray(body.days)) {
    await prisma.programDay.deleteMany({ where: { programId: id } });
    await prisma.programDay.createMany({
      data: body.days.map((day: { dayOfWeek: number; modality: string; templateId?: string }) => ({
        programId: id,
        dayOfWeek: Number(day.dayOfWeek),
        modality: day.modality,
        templateId: day.templateId || null,
      })),
    });
  }
  if (body.regenerate) await generateProgramSessions(id);
  return NextResponse.json({ program });
}
