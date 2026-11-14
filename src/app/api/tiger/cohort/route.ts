// GET /api/tiger/cohort?condition=Hypertension
// Everyone in the family with a condition, with their monthly trends. In Tiger Data this is one SQL query that
// JOINs relational profiles (family_members) with the time-series continuous aggregate (health_monthly).
import { NextResponse } from "next/server";
import { getFamily, getMonthlySummaries } from "@/lib/sample-data/health";
import { getCohortFromTiger, tigerConfigured } from "@/lib/tiger";

export async function GET(req: Request) {
  const condition = new URL(req.url).searchParams.get("condition")?.trim();
  if (!condition || condition.length < 3) {
    return NextResponse.json({ error: "Pass ?condition= (e.g. Hypertension, diabetes)" }, { status: 400 });
  }

  if (tigerConfigured()) {
    try {
      const { rows, queryMs } = await getCohortFromTiger(condition);
      const members = new Map<string, { id: string; name: string; relationship: string; months: unknown[] }>();
      for (const r of rows) {
        const id = String(r.id);
        if (!members.has(id)) members.set(id, { id, name: String(r.name), relationship: String(r.relationship), months: [] });
        members.get(id)!.months.push({
          month: r.month,
          avgSystolic: r.avg_sys == null ? undefined : Math.round(Number(r.avg_sys)),
          avgDiastolic: r.avg_dia == null ? undefined : Math.round(Number(r.avg_dia)),
          avgBloodGlucose: r.avg_glucose == null ? undefined : Math.round(Number(r.avg_glucose)),
          avgRestingHeartRate: Math.round(Number(r.avg_rhr) * 10) / 10,
          avgSteps: Math.round(Number(r.avg_steps)),
        });
      }
      return NextResponse.json({ condition, source: "Tiger Data", queryMs, members: [...members.values()] });
    } catch (err) {
      console.error("Tiger Data query failed, falling back to sample data:", err);
    }
  }

  const lower = condition.toLowerCase();
  const members = getFamily()
    .filter((m) => m.conditions.some((c) => c.toLowerCase().includes(lower)))
    .map((m) => ({ id: m.id, name: m.name, relationship: m.relationship, months: getMonthlySummaries(m.id) }));
  return NextResponse.json({ condition, source: "sample data", members });
}
