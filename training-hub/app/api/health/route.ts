import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "adaptive-fitness-training-hub",
    version: "v1",
  });
}
