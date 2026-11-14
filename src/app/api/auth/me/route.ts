// GET /api/auth/me -> who is using iCare on this device, which accounts this device remembers,
// and everyone the signed-in account can see (with their permission level and capabilities).
import { NextResponse } from "next/server";
import { currentAccount, deviceAccounts, visiblePeople } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [me, device] = await Promise.all([currentAccount(), deviceAccounts()]);
  if (!me) return NextResponse.json({ signedIn: false, account: null, deviceAccounts: device, people: [] });
  return NextResponse.json({ signedIn: true, account: me, deviceAccounts: device, people: await visiblePeople(me.id) });
}
