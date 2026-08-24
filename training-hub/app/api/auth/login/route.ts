import { NextRequest, NextResponse } from "next/server";
import { checkPasscode, createSessionToken, passcodeConfigured, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!passcodeConfigured()) {
    return NextResponse.json({ error: "APP_PASSCODE is not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const passcode = String(body.passcode ?? "");
  if (!checkPasscode(passcode)) {
    return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
  return response;
}
