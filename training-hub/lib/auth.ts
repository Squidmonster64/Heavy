import { cookies } from "next/headers";

export const SESSION_COOKIE = "th_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function encoder() {
  return new TextEncoder();
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

async function hmacHex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder().encode(payload));
  return toHex(mac);
}

function signingSecret() {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) throw new Error("APP_PASSCODE is not configured");
  return passcode;
}

export async function sign(payload: string) {
  const sig = await hmacHex(signingSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verify(token: string) {
  const split = token.lastIndexOf(".");
  if (split <= 0) return false;
  const payload = token.slice(0, split);
  const sig = token.slice(split + 1);
  try {
    const expected = await hmacHex(signingSecret(), payload);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

export function passcodeConfigured() {
  return Boolean(process.env.APP_PASSCODE);
}

export function checkPasscode(candidate: string) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  return timingSafeEqual(candidate, expected);
}

export async function createSessionToken() {
  return sign(`ok.${Date.now()}`);
}

export async function isSessionTokenValid(token: string | undefined) {
  if (!token) return false;
  try {
    return await verify(token);
  } catch {
    return false;
  }
}

export async function getSession() {
  const store = await cookies();
  return isSessionTokenValid(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function publicApiPath(pathname: string) {
  return (
    pathname === "/api/health" ||
    pathname === "/api/auth/login" ||
    pathname === "/login"
  );
}
