import { MatchStatus, SessionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseAthleteDate } from "@/lib/dates";
import { parseStructure } from "@/lib/validation/structures";
import { snapshotStructure } from "@/lib/program/clone";
import { applyExerciseWeight } from "@/lib/progression";
import type { StrengthStructure } from "@/lib/validation/structures";
import { externalIdForSession } from "@/lib/intervals/client";
import { createId } from "@/lib/program/id";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const sessions = await prisma.scheduledSession.findMany({
    where: {
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: parseAthleteDate(from) } : {}),
              ...(to ? { lte: parseAthleteDate(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const program = await prisma.program.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  if (!program) return fail(400, "No active program");
  const modality = body.modality;
  const structure = parseStructure(modality, body.structure);
  const id = createId();
  const session = await prisma.scheduledSession.create({
    data: {
      id,
      programId: program.id,
      date: parseAthleteDate(String(body.date)),
      modality,
      templateId: body.templateId || null,
      templateName: body.templateName || "One-off",
      plannedStructure: snapshotStructure(structure) as object,
      originalStructure: snapshotStructure(structure) as object,
      intervalsExternalId: externalIdForSession(id),
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ session });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const session = await prisma.scheduledSession.findUnique({ where: { id } });
  if (!session) return fail(404, "Session not found");

  if (body.action === "skip") {
    return NextResponse.json({
      session: await prisma.scheduledSession.update({ where: { id }, data: { status: SessionStatus.SKIPPED } }),
    });
  }
  if (body.action === "restore") {
    return NextResponse.json({
      session: await prisma.scheduledSession.update({ where: { id }, data: { status: SessionStatus.PLANNED } }),
    });
  }
  if (body.action === "complete") {
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: { status: SessionStatus.COMPLETED, completion: body.completion ?? session.completion ?? undefined },
      }),
    });
  }
  if (body.action === "move") {
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: { date: parseAthleteDate(String(body.date)) },
      }),
    });
  }
  if (body.action === "edit-session") {
    const structure = parseStructure(session.modality, body.structure);
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: {
          plannedStructure: snapshotStructure(structure) as object,
          originalStructure: (session.originalStructure ?? session.plannedStructure) as object,
          notes: body.notes ?? session.notes,
        },
      }),
    });
  }
  if (body.action === "replace-template") {
    const template = await prisma.sessionTemplate.findUnique({ where: { id: String(body.templateId) } });
    if (!template) return fail(404, "Template not found");
    const structure = parseStructure(template.modality, template.structure);
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: {
          templateId: template.id,
          templateName: template.name,
          modality: template.modality,
          plannedStructure: snapshotStructure(structure) as object,
          originalStructure: snapshotStructure(structure) as object,
        },
      }),
    });
  }
  if (body.action === "apply-progression") {
    if (session.modality !== "STRENGTH") return fail(400, "Progression applies to strength sessions");
    const planned = applyExerciseWeight(session.plannedStructure as StrengthStructure, String(body.name), Number(body.weightKg));
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: {
          originalStructure: (session.originalStructure ?? session.plannedStructure) as object,
          plannedStructure: planned as object,
        },
      }),
    });
  }
  if (body.action === "manual-match") {
    return NextResponse.json({
      session: await prisma.scheduledSession.update({
        where: { id },
        data: {
          intervalsActivityId: String(body.intervalsActivityId),
          matchStatus: MatchStatus.MANUAL_MATCHED,
          matchConfidence: 1,
          status: SessionStatus.COMPLETED,
        },
      }),
    });
  }
  return fail(400, "Unknown action");
}
