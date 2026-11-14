// GET /api/conditions/info?code=I10            (ICD-10 code)
// GET /api/conditions/info?name=Hypertension   (a condition name from the sample family)
// Plain-language explanation from MedlinePlus, plus the specialist who usually treats it.
import { NextResponse } from "next/server";
import { getConditionInfo } from "@/lib/medical/medlineplus";
import { lookupCondition } from "@/lib/medical/conditions";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const known = sp.get("name") ? lookupCondition(sp.get("name")!) : undefined;
  const code = sp.get("code") ?? known?.icd10;
  if (!code) {
    return NextResponse.json({ error: "Pass ?code=<ICD-10> or ?name=<known condition>" }, { status: 400 });
  }
  const topics = await getConditionInfo(code);
  return NextResponse.json({
    code,
    condition: known ?? null,
    topics,
    disclaimer: "Educational information from MedlinePlus (NLM), not medical advice.",
  });
}
