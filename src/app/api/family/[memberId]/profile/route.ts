// GET /api/family/<memberId>/profile   e.g. /api/family/rosa/profile
// A family member's sample profile, enriched with public medical data:
//   conditions  -> ICD-10 code, plain-language MedlinePlus explanation, which specialist treats it
//   medications -> our sample entry + MedlinePlus drug page (via RxNorm)
// Pairs with /api/sample/health/<memberId> (the numbers) for dashboards and summaries.
import { NextResponse } from "next/server";
import data from "@/data/medicines.json";
import { getMember, getMonthlySummaries } from "@/lib/sample-data/health";
import { lookupCondition } from "@/lib/medical/conditions";
import { getConditionInfo, getDrugInfo } from "@/lib/medical/medlineplus";
import { normalizeDrug } from "@/lib/medical/rxnorm";

export async function GET(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const member = getMember(memberId);
  if (!member) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });

  const conditions = await Promise.all(
    member.conditions.map(async (name) => {
      const info = lookupCondition(name);
      const topics = info ? await getConditionInfo(info.icd10, 1) : [];
      return { name, ...(info ?? {}), explanation: topics[0] ?? null };
    }),
  );

  const medications = await Promise.all(
    member.medications.map(async (id) => {
      const sample = data.medicines.find((m) => m.id === id) ?? null;
      const rx = sample ? await normalizeDrug(sample.genericName) : null;
      const info = rx ? await getDrugInfo(rx.rxcui) : [];
      return { id, sample, rxcui: rx?.rxcui ?? null, info: info[0] ?? null };
    }),
  );

  const monthly = getMonthlySummaries(memberId);
  return NextResponse.json({
    sample: true,
    member,
    conditions,
    medications,
    latestMonth: monthly.at(-1),
    disclaimer: "Fabricated person; explanations from MedlinePlus (NLM). Not medical advice.",
  });
}
