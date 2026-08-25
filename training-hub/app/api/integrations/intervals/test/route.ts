import { NextResponse } from "next/server";
import { testIntervalsConnection } from "@/lib/intervals/test";

export async function GET() {
  const result = await testIntervalsConnection();
  return NextResponse.json({
    connected: result.connected,
    athlete: result.athlete,
    athleteName: result.athleteName,
    lastTest: result.lastTest,
    error: result.error ?? null,
  });
}
