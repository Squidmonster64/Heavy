import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseStructure, modalitySchema } from "@/lib/validation/structures";

export async function GET() {
  const templates = await prisma.sessionTemplate.findMany({ orderBy: [{ modality: "asc" }, { name: "asc" }] });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const modality = modalitySchema.parse(body.modality);
  const structure = parseStructure(modality, body.structure);
  const template = await prisma.sessionTemplate.create({
    data: { name: String(body.name), modality, structure },
  });
  return NextResponse.json({ template });
}
