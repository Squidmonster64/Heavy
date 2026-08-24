import { NextRequest, NextResponse } from "next/server";
import { fail, unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { encodeSecondsPro } from "@/lib/export/secondsPro";
import { parseStructure } from "@/lib/validation/structures";

export async function GET(request: NextRequest) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return fail(400, "sessionId is required");
  const session = await prisma.scheduledSession.findUnique({ where: { id: sessionId } });
  if (!session || session.modality !== "REHAB") return fail(404, "Rehab session not found");
  try {
    const name = session.templateName || "Rehab";
    const json = encodeSecondsPro(parseStructure("REHAB", session.plannedStructure) as import("@/lib/validation/structures").RehabStructure, name);
    const exportLog = Array.isArray(session.exportLog) ? session.exportLog : [];
    await prisma.scheduledSession.update({
      where: { id: session.id },
      data: { exportLog: [...exportLog, { at: new Date().toISOString(), kind: "seconds" }] },
    });
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.seconds"`,
      },
    });
  } catch (error) {
    return fail(500, error instanceof Error ? error.message : "Seconds Pro encode failed");
  }
}
