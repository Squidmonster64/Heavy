import { NextResponse } from "next/server";
import { unauthorizedIfNeeded } from "@/lib/api";
import { testIntervalsConnection } from "@/lib/intervals/test";

export async function GET() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  const result = await testIntervalsConnection();
  return NextResponse.json({
    connected: result.connected,
    athlete: result.athlete,
    athleteName: result.athleteName,
    lastTest: result.lastTest,
    error: result.error ?? null,
  });
}
