import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertHeavyImportable, encodeHeavy } from "@/lib/export/heavy";
import { parseStructure } from "@/lib/validation/structures";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return fail(400, "sessionId is required");
  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session || session.modality !== "STRENGTH") return fail(404, "Strength session not found");
  try {
    const name = session.templateName || "Strength";
    const exercises = await prisma.exerciseLibrary.findMany();
    const exerciseIds = Object.fromEntries(exercises.map((exercise) => [exercise.name, exercise.id]));
    const envelope = encodeHeavy(parseStructure("STRENGTH", session.plannedStructure) as import("@/lib/validation/structures").StrengthStructure, { name, exerciseIds });
    assertHeavyImportable(envelope);
    const exportLog = Array.isArray(session.exportLog) ? session.exportLog : [];
    await prisma.scheduledSession.update({
      where: { id: session.id },
      data: { exportLog: [...exportLog, { at: new Date().toISOString(), kind: "heavy" }] },
    });
    return new NextResponse(JSON.stringify(envelope, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-lift-log.json"`,
      },
    });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Lift Log encode failed");
  }
}
