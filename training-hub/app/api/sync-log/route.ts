import { NextResponse } from "next/server";
import { unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const logs = await prisma.syncLog.findMany({ orderBy: { timestamp: "desc" }, take: 40 });
  return NextResponse.json({ logs });
}
