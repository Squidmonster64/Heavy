import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { pullActuals } from "@/lib/intervals/sync";

export async function POST() {
  try {
    return NextResponse.json(await pullActuals());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pull failed";
    return fail(502, message);
  }
}
