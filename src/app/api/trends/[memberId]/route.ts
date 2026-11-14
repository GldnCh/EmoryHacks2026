// GET /api/trends/<memberId>              -> monthly trends (input for monthly/yearly summaries)
// GET /api/trends/<memberId>?period=week  -> weekly trends
// Uses Tiger Data when TIGER_DATABASE_URL is set (monthly = pre-computed continuous aggregate),
// otherwise the built-in sample data (same shape). `queryMs` shows how fast the database answered.
// Health data: needs the "trends" permission (that person, or a Full / Health summary connection).
import { NextResponse } from "next/server";
import { authorizeMember, withAuthErrors } from "@/lib/auth";
import { getMember, getMonthlySummaries } from "@/lib/sample-data/health";
import { getTrendsFromTiger, tigerConfigured } from "@/lib/tiger";

export const dynamic = "force-dynamic";

export const GET = withAuthErrors(async (req: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { memberId } = await params;
  if (!getMember(memberId)) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  await authorizeMember("trends", memberId);
  const period = new URL(req.url).searchParams.get("period") === "week" ? "1 week" : "1 month";

  if (tigerConfigured()) {
    try {
      const { trends, queryMs, from } = await getTrendsFromTiger(memberId, period);
      if (trends.length) return NextResponse.json({ memberId, period, source: "Tiger Data", from, queryMs, trends });
    } catch (err) {
      console.error("Tiger Data query failed, falling back to sample data:", err);
    }
  }
  if (period === "1 week") {
    return NextResponse.json({ error: "Weekly trends need Tiger Data (TIGER_DATABASE_URL)." }, { status: 501 });
  }
  return NextResponse.json({ memberId, period, source: "sample data", trends: getMonthlySummaries(memberId) });
});
