import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { encodeWatchletic } from "@/lib/export/watchletic";
import { parseStructure } from "@/lib/validation/structures";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return fail(400, "sessionId is required");
  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session || session.modality !== "RUN") return fail(404, "Run session not found");
  try {
    const encoded = encodeWatchletic(parseStructure("RUN", session.plannedStructure) as import("@/lib/validation/structures").RunStructure, { name: session.templateName || "Run" });
    const exportLog = Array.isArray(session.exportLog) ? session.exportLog : [];
    await prisma.scheduledSession.update({
      where: { id: session.id },
      data: { exportLog: [...exportLog, { at: new Date().toISOString(), kind: "watchletic", perturbed: encoded.perturbed }] },
    });
    return NextResponse.json({ url: encoded.url, perturbed: encoded.perturbed });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Watchletic encode failed");
  }
}
