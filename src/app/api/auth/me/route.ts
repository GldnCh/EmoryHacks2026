// GET /api/auth/me -> whose iPhone this is, everyone they can see (level + capabilities), and how many
// connection requests are waiting for them. owner = null until the one-time setup at /setup.
import { NextResponse } from "next/server";
import { currentAccount, visiblePeople } from "@/lib/auth";
import { pendingRequestsFor } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentAccount();
  if (!me) return NextResponse.json({ setUp: false, account: null, people: [], incomingRequests: 0 });
  const [people, pending] = await Promise.all([visiblePeople(me.id), pendingRequestsFor(me.id)]);
  return NextResponse.json({ setUp: true, account: me, people, incomingRequests: pending.filter((r) => r.toId === me.id).length });
}
