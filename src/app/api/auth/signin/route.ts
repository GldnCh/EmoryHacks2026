// POST /api/auth/signin { accountId } -> signs that account in on THIS device (demo stand-in for Sign in with Apple).
// The device remembers it, so later you can switch back with one tap ("Use as Mia" on Mom's phone).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccount, logActivity } from "@/lib/auth/store";
import { cookieOptions, DEVICE_COOKIE, makeDeviceToken, makeSessionToken, readDeviceAccounts, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  const account = accountId ? await getAccount(accountId) : null;
  if (!account) return NextResponse.json({ error: "Unknown account." }, { status: 400 });

  const jar = await cookies();
  const device = readDeviceAccounts(jar.get(DEVICE_COOKIE)?.value);
  const previous = device[0] ?? null;

  const res = NextResponse.json({ ok: true, account });
  res.cookies.set(SESSION_COOKIE, makeSessionToken(account.id), cookieOptions);
  res.cookies.set(DEVICE_COOKIE, makeDeviceToken([account.id, ...device.filter((id) => id !== account.id)]), cookieOptions);
  await logActivity(account.id, account.id, "signin", { onDeviceOf: previous && previous !== account.id ? previous : undefined });
  return res;
}
