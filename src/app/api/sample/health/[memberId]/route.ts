// GET /api/sample/health/<memberId>                -> 12 months of daily metrics + monthly summaries
// GET /api/sample/health/<memberId>?month=2026-10  -> one month of daily metrics + all monthly summaries
// memberId: jordan | sam | mia | rosa. Fabricated demo data.
import { NextResponse } from "next/server";
import { getDailyMetrics, getMember, getMonthlySummaries } from "@/lib/sample-data/health";

export async function GET(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const member = getMember(memberId);
  if (!member) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must look like 2026-10" }, { status: 400 });
  }
  return NextResponse.json({
    sample: true,
    member,
    daily: getDailyMetrics(memberId, month),
    monthly: getMonthlySummaries(memberId),
  });
}
