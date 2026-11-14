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
  if (!ingredients.length) return null;

  // Brand names: for a single-ingredient drug, list only brands that contain JUST that ingredient.
  // RxNorm's plain BN list also includes combination products (e.g. lisinopril -> "Zestoretic", which is
  // lisinopril + hydrochlorothiazide). Branded drug names (SBD) end in "[Brand]" and contain " / " when
  // they combine ingredients, so we keep the brands from SBD names without " / ".
  let brandNames: string[];
  if (ingredients.length === 1) {
    brandNames = await singleIngredientBrands(ingredients[0].rxcui);
  } else {
    // the user typed a combination product: its own brand names are the right answer
    brandNames = (groups.find((g) => g.tty === "BN")?.conceptProperties ?? []).map((b) => b.name);
  }
  return {
    rxcui: ingredients[0].rxcui,
    ingredient: ingredients.map((i) => i.name).join(" / "),
    brandNames: brandNames.slice(0, 12),
    matchedFrom: term,
  };
}

async function singleIngredientBrands(ingredientRxcui: string): Promise<string[]> {
  const rel = await fetchJson<Related>(`${BASE}/rxcui/${ingredientRxcui}/related.json?tty=SBD`);
  const names = (rel?.relatedGroup?.conceptGroup ?? []).flatMap((g) => g.conceptProperties ?? []).map((p) => p.name);
  const brands = new Set<string>();
  for (const name of names) {
    if (name.includes(" / ")) continue; // combination product
    const m = name.match(/\[(.+?)\]\s*$/);
    if (m) brands.add(m[1]);
  }
  return [...brands].sort((a, b) => a.length - b.length || a.localeCompare(b));
}
