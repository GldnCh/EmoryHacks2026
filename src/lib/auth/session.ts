// Signed session cookies (server-only).
//   icare_session  who is using iCare right now on this device
//   icare_device   accounts that have signed in on this device (for one-tap "Use as Mia" switching)
// Signed with HMAC-SHA256 so a cookie can't be edited to impersonate someone. The key is AUTH_SECRET if set,
// otherwise derived from the (secret) database URL, so no extra setup is needed.
// Demo sign-in today; real Sign in with Apple later only changes HOW someone signs in, not these sessions.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "icare_session";
export const DEVICE_COOKIE = "icare_device";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, like staying signed in on your phone
const MAX_DEVICE_ACCOUNTS = 6;

function key(): Buffer {
  const base = process.env.AUTH_SECRET || (process.env.TIGER_DATABASE_URL ? `icare-session:${process.env.TIGER_DATABASE_URL}` : "icare-local-dev-only");
  return createHash("sha256").update(base).digest();
}

function sign(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify<T>(token: string | undefined): T | null {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

const ID_RE = /^[a-z0-9-]{1,40}$/;

export function makeSessionToken(accountId: string) {
  return sign({ a: accountId, iat: Date.now() });
}
export function readSessionToken(token: string | undefined): string | null {
  const p = verify<{ a: string; iat: number }>(token);
  if (!p || !ID_RE.test(p.a) || Date.now() - p.iat > COOKIE_MAX_AGE * 1000) return null;
  return p.a;
}

export function readDeviceAccounts(token: string | undefined): string[] {
  const p = verify<{ ids: string[] }>(token);
  return Array.isArray(p?.ids) ? p.ids.filter((id) => ID_RE.test(id)).slice(0, MAX_DEVICE_ACCOUNTS) : [];
}
export function makeDeviceToken(ids: string[]) {
  return sign({ ids: [...new Set(ids)].slice(0, MAX_DEVICE_ACCOUNTS) });
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};
