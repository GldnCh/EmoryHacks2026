// GET /api/conditions/search?q=high blood
// Condition / symptom autocomplete with ICD-10 codes (NLM Clinical Tables).
// Useful for the AI checkup ("what are you experiencing?") and for adding conditions to a profile.
import { NextResponse } from "next/server";
import { searchConditions } from "@/lib/medical/clinicaltables";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ error: "q must be at least 2 characters" }, { status: 400 });
  const results = await searchConditions(q);
  return NextResponse.json({ query: q, count: results.length, results });
}
