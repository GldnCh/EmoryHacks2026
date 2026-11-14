// "This iPhone belongs to ___" (server-only).
//
// iCare is designed as a native iPhone app that sits alongside Apple Health, Fitness, Apple Watch and AirPods:
// the phone itself is the identity, so there is no sign-in and nothing expires. In this web demo, the first visit
// asks once "Whose iPhone is this?" and remembers the answer in a signed cookie (HMAC-SHA256, httpOnly), which can't
// be edited to become someone else. The key is AUTH_SECRET if set, otherwise derived from the secret database URL.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_COOKIE = "icare_device_owner";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10; // "forever" for a browser cookie

function key(): Buffer {
  const base = process.env.AUTH_SECRET || (process.env.TIGER_DATABASE_URL ? `icare-session:${process.env.TIGER_DATABASE_URL}` : "icare-local-dev-only");
  return createHash("sha256").update(base).digest();
}

const ID_RE = /^[a-z0-9-]{1,40}$/;

export function makeOwnerToken(accountId: string): string {
  const body = Buffer.from(JSON.stringify({ a: accountId })).toString("base64url");
  return `${body}.${createHmac("sha256", key()).update(body).digest("base64url")}`;
}

export function readOwnerToken(token: string | undefined): string | null {
  if (!token || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { a: id } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof id === "string" && ID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const ownerCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: TEN_YEARS,
};
