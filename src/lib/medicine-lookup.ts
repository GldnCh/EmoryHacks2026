// Medicine search used by /api/medicines/search (typed queries) and /api/medicines/photo (names read off a label).
// Owner: Jam. How it works is described at the top of src/app/api/medicines/search/route.ts.
import { normalizeDrug } from "@/lib/medical/rxnorm";
import { ingredientKey, searchLabelsByUse, shortDrugName } from "@/lib/medical/openfda";
import { trimText } from "@/lib/medical/http";
import { correctSpelling, looksLikeDrugName } from "@/lib/spelling";
import {
  type EngineResult,
  type Facets,
  type Med,
  type SearchFilters,
  countFacets,
  isExactHit,
  passesFilters,
  searchLocal,
  searchTypesense,
  typesenseConfigured,
} from "@/lib/medicine-search";

export const MEDICINE_DISCLAIMER = "General reference information, not medical advice. Confirm with a pharmacist or doctor.";

/** Typesense first; on any error, the local list. */
async function searchOurList(q: string, filters: SearchFilters): Promise<EngineResult> {
  if (typesenseConfigured()) {
    try {
      return await searchTypesense(q, filters);
    } catch (err) {
      console.warn("[medicines/search] Typesense failed, using local list:", err instanceof Error ? err.message : err);
    }
  }
  return searchLocal(q, filters);
}

/** Add one medicine to facet counts (used when RxNorm finds a match the engine missed). */
function bump(facets: Facets, m: Med): Facets {
  const inc = (list: { value: string; count: number }[], value: string) =>
    list.some((f) => f.value === value)
      ? list.map((f) => (f.value === value ? { ...f, count: f.count + 1 } : f))
      : [...list, { value, count: 1 }];
  return {
    drugClass: inc(facets.drugClass, m.drugClass),
    prescriptionRequired: inc(facets.prescriptionRequired, String(m.prescriptionRequired)),
  };
}

/** The full medicine search for one query. Returns the /api/medicines/search response body. */
export async function searchMedicines(q: string, filters: SearchFilters = {}) {
  // 1 + 2. our list, RxNorm and the spelling check in parallel (so the spelling check adds no wait)
  const [engine, rxMatch, correction] = await Promise.all([searchOurList(q, filters), normalizeDrug(q), correctSpelling(q)]);
  let { hits, facets } = engine;
  // A drug name ("zyrtec", "lisinoprl") is RxNorm's job: never spell-correct those. RxNorm's fuzzy search always
  // returns something ("insmonia" -> ethanol), so only trust it when the match looks like what was typed.
  const isDrugName = looksLikeDrugName(q, rxMatch);
  const rxnorm = isDrugName ? rxMatch : null;
  const spelling = isDrugName ? null : correction;

  // For uses and symptoms, drop hits that only matched through a typo ("acne" -> "ACE inhibitor", "aches").
  // Misspellings are handled by the spelling correction below instead, with a real medical dictionary.
  if (!isDrugName) {
    const exact = hits.filter((h) => isExactHit(h, q));
    if (exact.length < hits.length) {
      hits = exact;
      facets = countFacets(exact.map((h) => h.med));
    }
  }

  // A misspelled use or symptom ("insomnea", or a 3-letter typo that's past Typesense's 2-typo limit):
  // search our list again with the corrected words and add anything new.
  if (spelling && hits.length < 3) {
    const again = await searchOurList(spelling.corrected, filters);
    const fresh = again.hits.filter((h) => isExactHit(h, spelling.corrected) && !hits.some((x) => x.med.id === h.med.id));
    facets = hits.length ? fresh.reduce((f, h) => bump(f, h.med), facets) : again.facets;
    hits = [...hits, ...fresh];
  }

  // If RxNorm recognised a drug on our list that the engine missed, put it first.
  if (rxnorm) {
    const ingredient = rxnorm.ingredient.toLowerCase();
    const extra = searchLocal(rxnorm.ingredient, {}).hits.filter(
      (h) => h.med.genericName.toLowerCase().includes(ingredient) && !hits.some((x) => x.med.id === h.med.id),
    );
    for (const h of extra) facets = bump(facets, h.med);
    hits = [...extra.filter((h) => passesFilters(h.med, filters)), ...hits];
  }

  const results: Record<string, unknown>[] = hits.map(({ med: m, highlights }) => ({
    id: m.id,
    name: m.genericName,
    brandNames: m.brandNames,
    drugClass: m.drugClass,
    uses: m.commonUses,
    prescriptionRequired: m.prescriptionRequired,
    source: "iCare sample list",
    highlights,
  }));

  // 3. widen with openFDA labels when we have fewer than 3 matches.
  // FDA labels have no drug class here, so skip them when a class filter is on.
  if (results.length < 3 && !filters.drugClass) {
    // compare by ingredients, so FDA "FLUTICASONE PROPIONATE NASAL" doesn't repeat our "Fluticasone (nasal)"
    const known = new Set(hits.map((h) => ingredientKey(h.med.genericName)));
    // openFDA only matches exact words, so it gets the corrected spelling
    for (const label of await searchLabelsByUse(spelling?.corrected ?? q, 5)) {
      if (known.has(ingredientKey(label.genericName!))) continue;
      if (filters.rx !== undefined && label.isPrescription !== filters.rx) continue;
      results.push({
        id: label.genericName!.toLowerCase(), // detail page key; full name, not the shortened one
        name: shortDrugName(label.genericName!),
        // many generic labels list the generic name as the "brand"; only keep real brand names
        brandNames: label.brandNames
          .filter((b) => ingredientKey(b) !== ingredientKey(label.genericName!))
          .map((b) => shortDrugName(b, 40))
          .slice(0, 3),
        uses: trimText(label.purpose ?? label.indications, 220),
        prescriptionRequired: label.isPrescription,
        source: "openFDA",
        highlights: [],
      });
    }
  }

  return {
    query: q,
    rxnorm, // e.g. { ingredient: "cetirizine", brandNames: [...] } or null
    spelling, // e.g. { corrected: "insomnia", source: "MedlinePlus" } or null
    count: results.length,
    results,
    source: engine.engine,
    facets,
    searchMs: engine.searchMs,
    filters,
    disclaimer: MEDICINE_DISCLAIMER,
  };
}
