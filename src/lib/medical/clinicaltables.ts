// NLM Clinical Tables: condition / symptom lookup with ICD-10 codes (great for autocomplete).
// Docs: https://clinicaltables.nlm.nih.gov/apidoc/conditions/v3/doc.html  No key needed.
import { fetchJson, safeTerm } from "./http";

export interface ConditionMatch {
  name: string; // consumer-friendly name
  icd10: string[];
  source: "NLM Clinical Tables";
}

type Raw = [number, string[], { icd10cm_codes?: string[]; consumer_name?: string[] } | null, string[][]];

export async function searchConditions(term: string, max = 8): Promise<ConditionMatch[]> {
  const q = safeTerm(term);
  if (q.length < 2) return [];
  const data = await fetchJson<Raw>(
    `https://clinicaltables.nlm.nih.gov/api/conditions/v3/search?terms=${encodeURIComponent(q)}&maxList=${max}&ef=icd10cm_codes,consumer_name`,
  );
  if (!data) return [];
  const [, , extra, display] = data;
  return display.map((d, i) => ({
    name: extra?.consumer_name?.[i] || d[0],
    icd10: (extra?.icd10cm_codes?.[i] ?? "").split(",").map((c) => c.trim()).filter(Boolean),
    source: "NLM Clinical Tables" as const,
  }));
}
