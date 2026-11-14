// GET /api/checkins/<memberId>   Owner: Ish.
// A family member's saved check-in history (FaceTime call summaries), newest first, from Tiger Data.
// Health data: only that person, or someone they share "Full" with (check-ins capability), may read it.
import { NextResponse } from "next/server";
import { getMember } from "@/lib/sample-data/health";
import { getCheckinSummaries, tigerConfigured } from "@/lib/tiger";
import { DISCLAIMER } from "@/lib/ai/safety";
import { authorizeMember, withAuthErrors } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = withAuthErrors(async (_req: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { memberId } = await params;
  if (!getMember(memberId)) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  await authorizeMember("checkins", memberId); // 401 if this iPhone isn't set up, 403 without Full access
  if (!tigerConfigured()) return NextResponse.json({ memberId, checkins: [], source: "none (TIGER_DATABASE_URL is not set)" });
  try {
    const { checkins, queryMs } = await getCheckinSummaries(memberId);
    return NextResponse.json({ memberId, checkins, queryMs, source: "Tiger Data", disclaimer: DISCLAIMER });
  } catch (err) {
    // The table is created by db/tiger/schema.sql; until then there is simply no history yet.
    if ((err as { code?: string }).code === "42P01") return NextResponse.json({ memberId, checkins: [], source: "Tiger Data" });
    console.error("Loading check-in history failed:", err);
    return NextResponse.json({ error: "Couldn't load check-in history." }, { status: 500 });
  }
});
