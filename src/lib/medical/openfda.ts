// openFDA (U.S. FDA): official drug labels. Docs: https://open.fda.gov/apis/drug/label/
// No key needed (limit ~1,000 requests/day per IP). Add OPENFDA_API_KEY for a higher limit.
// FDA disclaimer: do not rely on openFDA to make decisions regarding medical care.
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

function first(r: Raw, ...keys: string[]) {
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v) && typeof v[0] === "string" && v[0]) return trimText(v[0]);
  }
  return undefined;
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
    boxedWarning: first(r, "boxed_warning"),
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
    url(`openfda.generic_name:"${q}" OR openfda.brand_name:"${q}"`, 1),
  );
  return data?.results?.[0] ? toLabel(data.results[0]) : null;
}

/** Search labels by what the drug is used for, e.g. "heartburn". Used when our own list has no match. */
export async function searchLabelsByUse(term: string, limit = 5): Promise<DrugLabel[]> {
  const q = safeTerm(term);
  if (!q) return [];
  const data = await fetchJson<{ results?: Raw[] }>(
    url(`indications_and_usage:"${q}" OR purpose:"${q}"`, Math.min(limit * 4, 50)),
  );
  const labels = (data?.results ?? []).map(toLabel).filter((l) => l.genericName);
  // the same drug often has many labels from different makers; keep one per generic name
  return [...new Map(labels.map((l) => [l.genericName!.toLowerCase(), l])).values()].slice(0, limit);
}
