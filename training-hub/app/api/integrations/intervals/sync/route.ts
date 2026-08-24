import { NextResponse } from "next/server";
import { fail, unauthorizedIfNeeded } from "@/lib/api";
import { prisma } from "@/lib/db";
import { syncNow } from "@/lib/intervals/sync";

export async function POST() {
  const denied = await unauthorizedIfNeeded();
  if (denied) return denied;
  try {
    return NextResponse.json(await syncNow());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await prisma.syncLog.create({
      data: { direction: "sync", entityType: "intervals", status: "error", detail: message },
    });
    return fail(502, message);
  }
}
