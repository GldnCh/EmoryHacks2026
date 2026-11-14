// GET /api/medicines/search?q=zyrtec
// Optional filters: &rx=true (prescription only) | &rx=false (over the counter only) · &class=Antihistamine
//
// 1. Search our 38 medicines with Typesense (typo-tolerant, ranked, facets, highlights).
//    If Typesense isn't configured or errors, the same search runs on the local list, so the demo never breaks.
// 2. RxNorm turns brand names / typos into the standard generic name ("zyrtec" -> cetirizine); runs in parallel.
// 3. Spelling: a misspelled use or symptom ("insomnea") is corrected (src/lib/spelling.ts: MedlinePlus, then our own
//    vocabulary, up to 3 wrong letters on long words). Used to re-search our list and for openFDA. Skipped for drug names.
// 4. openFDA finds more drugs by what they're used for ("heartburn") when we have fewer than 3 hits.
//
// Response (backward compatible): { query, rxnorm, count, results[], disclaimer }
//   + source   "Typesense" | "Local list"   (which engine searched our list)
//   + facets   { drugClass: [{value,count}], prescriptionRequired: [{value:"true"|"false",count}] } before filters
//   + searchMs round trip of the search step in ms
//   + filters  the filters that were applied
//   + spelling { corrected, source } when the query was misspelled, else null
// Each result keeps { id?, name, brandNames, drugClass?, uses, prescriptionRequired, source } and adds highlights[].
import { NextResponse } from "next/server";
import type { SearchFilters } from "@/lib/medicine-search";
import { searchMedicines } from "@/lib/medicine-lookup";

function parseFilters(sp: URLSearchParams): SearchFilters {
  const rx = sp.get("rx")?.toLowerCase();
  const drugClass = sp.get("class")?.trim();
  return {
    rx: rx === "true" ? true : rx === "false" ? false : undefined,
    drugClass: drugClass || undefined,
  };
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ error: "q must be at least 2 characters" }, { status: 400 });
  return NextResponse.json(await searchMedicines(q, parseFilters(sp)));
}
