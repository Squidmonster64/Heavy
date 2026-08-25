import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const modality = searchParams.get("modality");
  const equipment = searchParams.get("equipment");
  const family = searchParams.get("family");
  const knee = searchParams.get("knee");
  const shoulder = searchParams.get("shoulder");
  const spine = searchParams.get("spine");
  const templates = searchParams.get("tab") !== "exercises"
    ? await prisma.sessionTemplate.findMany({
        where: { ...(modality ? { modality: modality as never } : {}) },
        orderBy: { name: "asc" },
      })
    : [];
  const exercises = await prisma.exerciseLibrary.findMany({
    where: {
      ...(equipment ? { equipment } : {}),
      ...(family ? { family } : {}),
      ...(knee ? { kneeFlag: { not: null } } : {}),
      ...(shoulder ? { shoulderFlag: { not: null } } : {}),
      ...(spine ? { spineFlag: { not: null } } : {}),
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ templates, exercises });
}
