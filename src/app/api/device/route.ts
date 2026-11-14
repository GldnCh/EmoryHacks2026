// "Whose iPhone is this?" (one-time device setup; the native app would know this from the iPhone itself).
//
// GET    /api/device                -> the device owner (or null if not set up yet)
// POST   /api/device { accountId }  -> set up this device for that person (only if not set up yet, unless demo=true)
// DELETE /api/device                -> demo only: "pretend to be another iPhone" (forgets the owner on this browser;
//                                      nobody's data or connections change)
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccount, logActivity } from "@/lib/auth/store";
import { makeOwnerToken, OWNER_COOKIE, ownerCookieOptions, readOwnerToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const id = readOwnerToken((await cookies()).get(OWNER_COOKIE)?.value);
  return NextResponse.json({ owner: id ? await getAccount(id) : null });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const account = typeof body?.accountId === "string" ? await getAccount(body.accountId) : null;
  if (!account) return NextResponse.json({ error: "Unknown person." }, { status: 400 });
  const existing = readOwnerToken((await cookies()).get(OWNER_COOKIE)?.value);
  if (existing && existing !== account.id && body?.demoSwitch !== true) {
    return NextResponse.json({ error: "This iPhone is already set up. (Demo: use “Pretend to be another iPhone”.)" }, { status: 409 });
  }
  const res = NextResponse.json({ ok: true, owner: account });
  res.cookies.set(OWNER_COOKIE, makeOwnerToken(account.id), ownerCookieOptions);
  await logActivity(account.id, account.id, "device.setup", existing && existing !== account.id ? { previousOwner: existing } : undefined);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
