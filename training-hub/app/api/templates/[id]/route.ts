import { NextRequest, NextResponse } from "next/server";
import { fail, unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseStructure } from "@/lib/validation/structures";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const { id } = await params;
  const existing = await prisma.sessionTemplate.findUnique({ where: { id } });
  if (!existing) return fail(404, "Template not found");
  const body = await request.json().catch(() => ({}));
  const structure = body.structure != null ? parseStructure(existing.modality, body.structure) : undefined;
  const template = await prisma.sessionTemplate.update({
    where: { id },
    data: {
      name: body.name != null ? String(body.name) : undefined,
      structure,
    },
  });
  return NextResponse.json({ template, note: "Existing scheduled sessions keep their snapshots." });
}
