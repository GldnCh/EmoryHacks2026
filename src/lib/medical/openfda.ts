// openFDA (U.S. FDA): official drug labels. Docs: https://open.fda.gov/apis/drug/label/
// No key needed (limit ~1,000 requests/day per IP). Add OPENFDA_API_KEY for a higher limit.
// FDA disclaimer: do not rely on openFDA to make decisions regarding medical care.
import { dedupeSentences } from "@/lib/dedupe-text";
import { fetchJson, safeTerm, trimText } from "./http";

const BASE = "https://api.fda.gov/drug/label.json";

export interface DrugLabel {
  genericName?: string;
  brandNames: string[];
  route: string[];
  isPrescription: boolean;
  purpose?: string; // OTC labels
  indications?: string; // "uses"
  boxedWarning?: string; // most serious warnings
  warnings?: string;
  doNotUse?: string;
  askDoctor?: string;
  stopUse?: string;
  adverseReactions?: string;
  drugInteractions?: string;
  dosageForms?: string;
  labelDate?: string;
  dailyMedUrl?: string; // full official label
  source: "openFDA";
}

type Raw = Record<string, unknown> & {
  openfda?: Record<string, string[]>;
  set_id?: string;
  effective_time?: string;
};

function raw(r: Raw, ...keys: string[]) {
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v) && typeof v[0] === "string" && v[0]) return v[0];
  }
  return undefined;
}

const first = (r: Raw, ...keys: string[]) => trimText(raw(r, ...keys));

/**
 * Boxed warnings, cleaned for display. Prescription labels put the short "Highlights" warning and the full one
 * in the same field, so the text repeats ("WARNING: FETAL TOXICITY" twice on lisinopril). We drop pointers like
 * "See full prescribing information…" and section numbers "( 5.1 )", then remove exact repeats with
 * dedupeSentences (src/lib/dedupe-text.ts). Distinct sentences are always kept, and the text isn't shortened.
 */
export function cleanBoxedWarning(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const t = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^BOXED WARNING:?\s+(?=WARNING)/i, "") // the app's callout is already titled "FDA boxed warning"
    .replace(/See full prescribing information for complete boxed warning\.?/gi, "")
    .replace(/\[\s*see [^\]]*\]/gi, "")
    .replace(/\(\s*\d+(\.\d+)*(\s*,\s*\d+(\.\d+)*)*\s*\)/g, "")
    .replace(/\s+([.,;])/g, "$1");
  return trimText(dedupeSentences(t), 10_000);
}

function toLabel(r: Raw): DrugLabel {
  const ofda = r.openfda ?? {};
  return {
    genericName: ofda.generic_name?.[0],
    brandNames: [...new Set(ofda.brand_name ?? [])].slice(0, 8),
    route: ofda.route ?? [],
    isPrescription: (ofda.product_type?.[0] ?? "").includes("PRESCRIPTION"),
    purpose: first(r, "purpose"),
    indications: first(r, "indications_and_usage"),
    boxedWarning: cleanBoxedWarning(raw(r, "boxed_warning")),
    warnings: first(r, "warnings_and_cautions", "warnings"),
    doNotUse: first(r, "do_not_use"),
    askDoctor: first(r, "ask_doctor", "ask_doctor_or_pharmacist"),
    stopUse: first(r, "stop_use"),
    adverseReactions: first(r, "adverse_reactions"),
    drugInteractions: first(r, "drug_interactions"),
    dosageForms: first(r, "dosage_forms_and_strengths"),
    labelDate: r.effective_time,
    dailyMedUrl: r.set_id ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${r.set_id}` : undefined,
    source: "openFDA",
  };
}

function url(search: string, limit: number) {
  const key = process.env.OPENFDA_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENFDA_API_KEY)}` : "";
  return `${BASE}?search=${encodeURIComponent(search)}&limit=${limit}${key}`;
}

/** The official label for one drug, by generic or brand name. */
export async function getDrugLabel(name: string): Promise<DrugLabel | null> {
  const q = safeTerm(name);
  if (!q) return null;
  const data = await fetchJson<{ results?: Raw[] }>(
    url(`openfda.generic_name:"${q}" OR openfda.brand_name:"${q}"`, 10),
  );
  const results = data?.results ?? [];
  // Prefer the single-ingredient label ("LISINOPRIL") over combinations ("LISINOPRIL AND HYDROCHLOROTHIAZIDE").
  const lower = q.toLowerCase();
  const exact = results.find((r) =>
    [...(r.openfda?.generic_name ?? []), ...(r.openfda?.brand_name ?? [])].some((n) => n.toLowerCase() === lower),
  );
  const best = exact ?? results[0];
  return best ? toLabel(best) : null;
}

/** Search labels by what the drug is used for, e.g. "heartburn". Used when our own list has no match. */
export async function searchLabelsByUse(term: string, limit = 5): Promise<DrugLabel[]> {
  const q = safeTerm(term);
  if (!q) return [];
  const data = await fetchJson<{ results?: Raw[] }>(
    url(`indications_and_usage:"${q}" OR purpose:"${q}"`, Math.min(limit * 4, 50)),
  );
  const seen = new Set<string>();
  const labels: DrugLabel[] = [];
  for (const r of data?.results ?? []) {
    if (isHomeopathic(r)) continue;
    const label = toLabel(r);
    if (!label.genericName) continue;
    // some records have no substance list, so also count the ingredients in the name
    const ingredients = Math.max(r.openfda?.substance_name?.length ?? 0, splitIngredients(label.genericName).length);
    if (ingredients > MAX_INGREDIENTS) continue;
    // the same drug often has many labels from different makers and salts; keep one per ingredient set
    const key = ingredientKey(label.genericName);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.slice(0, limit);
}

/** Search results skip products with more ingredients than this (long multi-symptom or homeopathic mixes). */
const MAX_INGREDIENTS = 3;

/** Homeopathic products aren't FDA-evaluated for effectiveness; they say so on the label. */
function isHomeopathic(r: Raw) {
  return ["purpose", "indications_and_usage", "package_label_principal_display_panel", "description"].some((k) =>
    /homeopathic/i.test(raw(r, k) ?? ""),
  );
}

// Salt, form and label words that don't change which drug it is.
const NOISE =
  /\b(hydrochloride|hydrobromide|hcl|maleate|propionate|sulfate|succinate|tartrate|citrate|besylate|mesylate|fumarate|sodium|potassium|magnesium|monohydrate|dihydrate|nasal|oral|topical|extended|delayed|release|er|xr|dr|tablets?|capsules?|solution|suspension|spray|usp|and)\b/g;

/**
 * A comparable key for a drug: its ingredients without salts or forms, sorted.
 * "BROMPHENIRAMINE MALEATE, PSEUDOEPHEDRINE HCL AND DEXTROMETHORPHAN" and
 * "Brompheniramine, Pseudoephedrine, Dextromethorphan" give the same key; "Fluticasone (nasal)" -> "fluticasone".
 */
export function ingredientKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(NOISE, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2);
  return [...new Set(words)].sort().join("+");
}

/** "A, B and C" -> ["A", "B", "C"] */
const splitIngredients = (name: string) => name.split(/\s*,\s*(?:and\s+)?|\s+and\s+/i).filter(Boolean);

// Salt words people don't need on a result card.
const SALTS = /\s+\b(hydrochloride|hydrobromide|hcl|hbr|maleate|sulfate|succinate|tartrate|citrate|besylate|mesylate|fumarate)\b/gi;

/**
 * A name short enough for a result card. Title case; if too long, drop salt words
 * ("Brompheniramine, Pseudoephedrine, Dextromethorphan"), then fall back to "A, B and 2 more".
 */
export function shortDrugName(name: string, max = 60): string {
  const titled = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  if (titled.length <= max) return titled;
  const parts = splitIngredients(titled.replace(SALTS, ""));
  const joined = parts.join(", ");
  if (joined.length <= max) return joined;
  let out = parts[0];
  let used = 1;
  while (used < parts.length && `${out}, ${parts[used]}`.length <= max - 12) out = `${out}, ${parts[used++]}`;
  return used < parts.length ? `${out} and ${parts.length - used} more` : out.slice(0, max - 1) + "…";
}
