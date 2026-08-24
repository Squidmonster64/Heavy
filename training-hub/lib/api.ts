import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function unauthorizedIfNeeded() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}
