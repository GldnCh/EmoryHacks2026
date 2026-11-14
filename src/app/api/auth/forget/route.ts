// POST /api/auth/forget { accountId } -> removes an account from THIS device's list (e.g. Mia used Mom's phone
// and wants to be forgotten). Signs it out too if it's the current one. Their data stays in their account.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieOptions, DEVICE_COOKIE, makeDeviceToken, readDeviceAccounts, readSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const jar = await cookies();
  const device = readDeviceAccounts(jar.get(DEVICE_COOKIE)?.value).filter((id) => id !== accountId);
  const res = NextResponse.json({ ok: true, deviceAccounts: device });
  res.cookies.set(DEVICE_COOKIE, makeDeviceToken(device), cookieOptions);
  if (readSessionToken(jar.get(SESSION_COOKIE)?.value) === accountId) res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
