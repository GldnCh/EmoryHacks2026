// GET /api/medicines/search?q=zyrtec
// Searches our 38 sample medicines first, then widens with public data:
//   - RxNorm turns brand names / typos into the standard generic name ("zyrtec" -> cetirizine)
//   - openFDA finds more drugs by what they're used for ("heartburn") when our list has few matches
// Once Typesense is seeded, the local step can switch to Typesense; the response shape stays the same.
import { NextResponse } from "next/server";
import data from "@/data/medicines.json";
import { normalizeDrug } from "@/lib/medical/rxnorm";
import { searchLabelsByUse } from "@/lib/medical/openfda";

type Med = (typeof data.medicines)[number];

const matches = (m: Med, q: string) =>
  [m.genericName, ...m.brandNames, m.drugClass, ...m.commonUses].join(" ").toLowerCase().includes(q);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ error: "q must be at least 2 characters" }, { status: 400 });
  const lower = q.toLowerCase();

  // 1. our sample list, plus RxNorm normalization for brand names and misspellings
  const rxnorm = await normalizeDrug(q);
  const found = new Map<string, Med>();
  for (const m of data.medicines) {
    if (matches(m, lower) || (rxnorm && m.genericName.toLowerCase().includes(rxnorm.ingredient.toLowerCase()))) {
      found.set(m.id, m);
    }
  }
  const results: Record<string, unknown>[] = [...found.values()].map((m) => ({
    id: m.id,
    name: m.genericName,
    brandNames: m.brandNames,
    drugClass: m.drugClass,
    uses: m.commonUses,
    prescriptionRequired: m.prescriptionRequired,
    source: "IDoc sample list",
  }));

  // 2. widen with openFDA labels when we have fewer than 3 matches
  if (results.length < 3) {
    const known = new Set([...found.values()].map((m) => m.genericName.toLowerCase()));
    for (const label of await searchLabelsByUse(q, 5)) {
      if (known.has(label.genericName!.toLowerCase())) continue;
      results.push({
        name: label.genericName,
        brandNames: label.brandNames,
        uses: label.purpose ?? label.indications,
        prescriptionRequired: label.isPrescription,
        source: "openFDA",
      });
    }
  }

  return NextResponse.json({
    query: q,
    rxnorm, // e.g. { ingredient: "cetirizine", brandNames: [...] } or null
    count: results.length,
    results,
    disclaimer: "General reference information, not medical advice. Confirm with a pharmacist or doctor.",
  });
}
