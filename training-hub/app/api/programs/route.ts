import { NextRequest, NextResponse } from "next/server";
import { fail, unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { DEFAULT_PROGRAM_CONFIG } from "@/lib/config";
import { parseAthleteDate } from "@/lib/dates";
import { generateProgramSessions } from "@/lib/program/service";

export async function GET() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const programs = await prisma.program.findMany({ include: { days: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ programs });
}

export async function POST(request: NextRequest) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (!body.name || !body.startDate) return fail(400, "name and startDate are required");
  const program = await prisma.program.create({
    data: {
      name: String(body.name),
      startDate: parseAthleteDate(String(body.startDate)),
      endDate: body.endDate ? parseAthleteDate(String(body.endDate)) : null,
      taperStart: body.taperStart ? parseAthleteDate(String(body.taperStart)) : null,
      raceDate: body.raceDate ? parseAthleteDate(String(body.raceDate)) : null,
      config: body.config ?? DEFAULT_PROGRAM_CONFIG,
      days: {
        create: Array.isArray(body.days)
          ? body.days.map((day: { dayOfWeek: number; modality: string; templateId?: string }) => ({
              dayOfWeek: Number(day.dayOfWeek),
              modality: day.modality,
              templateId: day.templateId || null,
            }))
          : [],
      },
    },
    include: { days: true },
  });
  if (body.generate !== false) await generateProgramSessions(program.id);
  return NextResponse.json({ program });
}
