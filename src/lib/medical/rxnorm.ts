// RxNorm / RxNav (National Library of Medicine): standard drug names, brand <-> generic.
// Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/  No key needed.
import { fetchJson, safeTerm } from "./http";

const BASE = "https://rxnav.nlm.nih.gov/REST";

export interface RxNormDrug {
  rxcui: string; // ingredient-level RxNorm id
  ingredient: string;
  brandNames: string[];
  matchedFrom: string; // what the user typed
}

type Approx = { approximateGroup?: { candidate?: { rxcui: string; name?: string }[] } };
type Related = {
  relatedGroup?: { conceptGroup?: { tty: string; conceptProperties?: { rxcui: string; name: string }[] }[] };
};

/** Turn anything the user types ("zyrtec", "lisinoprl") into the standard ingredient + brand names. */
export async function normalizeDrug(term: string): Promise<RxNormDrug | null> {
  const q = safeTerm(term);
  if (!q) return null;
  const approx = await fetchJson<Approx>(`${BASE}/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=3`);
  const rxcui = approx?.approximateGroup?.candidate?.[0]?.rxcui;
  if (!rxcui) return null;

  const rel = await fetchJson<Related>(`${BASE}/rxcui/${rxcui}/related.json?tty=IN+BN`);
  const groups = rel?.relatedGroup?.conceptGroup ?? [];
  const ingredients = groups.find((g) => g.tty === "IN")?.conceptProperties ?? [];
  const brands = groups.find((g) => g.tty === "BN")?.conceptProperties ?? [];
  if (!ingredients.length) return null;
  return {
    rxcui: ingredients[0].rxcui,
    ingredient: ingredients.map((i) => i.name).join(" / "),
    brandNames: brands.map((b) => b.name).slice(0, 12),
    matchedFrom: term,
  };
}
