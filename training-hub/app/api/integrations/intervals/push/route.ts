import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { pushPlan } from "@/lib/intervals/sync";

export async function POST() {
  try {
    return NextResponse.json(await pushPlan());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push failed";
    return fail(502, message);
  }
}
