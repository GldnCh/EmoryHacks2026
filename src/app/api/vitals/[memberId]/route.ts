// GET /api/vitals/<memberId>?date=2026-10-03
// One day hour by hour: average/min/max heart rate and steps, rolled up from minute-by-minute readings.
// Tiger Data: read from the `vitals_hourly` continuous aggregate. Otherwise computed from the sample generator.
import { NextResponse } from "next/server";
import { getHourlyVitals, getMember, SAMPLE_END, SAMPLE_START } from "@/lib/sample-data/health";
import { getHourlyFromTiger, tigerConfigured } from "@/lib/tiger";

export async function GET(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  if (!getMember(memberId)) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const date = new URL(req.url).searchParams.get("date") ?? SAMPLE_END;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < SAMPLE_START || date > SAMPLE_END) {
    return NextResponse.json({ error: `date must be YYYY-MM-DD between ${SAMPLE_START} and ${SAMPLE_END}` }, { status: 400 });
  }

  if (tigerConfigured()) {
    try {
      const { hours, queryMs } = await getHourlyFromTiger(memberId, date);
      if (hours.length) {
        return NextResponse.json({ memberId, date, source: "Tiger Data", from: "continuous aggregate vitals_hourly", queryMs, hours });
      }
    } catch (err) {
      console.error("Tiger Data query failed, falling back to sample data:", err);
    }
  }
  return NextResponse.json({ memberId, date, source: "sample data", hours: getHourlyVitals(memberId, date) });
}
