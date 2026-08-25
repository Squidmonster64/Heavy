import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const logs = await prisma.syncLog.findMany({ orderBy: { timestamp: "desc" }, take: 40 });
  return NextResponse.json({ logs });
}
