// MedlinePlus (National Library of Medicine): plain-language health info. No key needed.
//   - MedlinePlus Connect: topics by ICD-10 / RxNorm code. Docs: https://medlineplus.gov/medlineplus-connect/web-service/
//   - MedlinePlus Web Service: health-topic search, used here only for its spelling suggestions.
//     Docs: https://medlineplus.gov/about/developers/webservices/  (limit: 85 requests/minute per IP)
import { fetchJson, fetchText, trimText } from "./http";

const BASE = "https://connect.medlineplus.gov/service";
const ICD10_SYSTEM = "2.16.840.1.113883.6.90";
const RXNORM_SYSTEM = "2.16.840.1.113883.6.88";

export interface HealthTopic {
  title: string;
  summary?: string;
  url: string;
  source: "MedlinePlus";
}

type Feed = {
  feed?: { entry?: { title?: { _value: string }; link?: { href: string }[]; summary?: { _value: string } }[] };
};

async function lookup(system: string, code: string, max: number): Promise<HealthTopic[]> {
  if (!/^[A-Za-z0-9.]{1,12}$/.test(code)) return [];
  const data = await fetchJson<Feed>(
    `${BASE}?mainSearchCriteria.v.cs=${system}&mainSearchCriteria.v.c=${code}&knowledgeResponseType=application/json&informationRecipient.languageCode.c=en`,
  );
  return (data?.feed?.entry ?? []).slice(0, max).map((e) => ({
    title: e.title?._value ?? "",
    summary: trimText(e.summary?._value, 500),
    url: (e.link?.[0]?.href ?? "").replace(/\?utm_.*$/, ""),
    source: "MedlinePlus" as const,
  }));
}

/** Plain-language explanation of a condition, by ICD-10 code (e.g. "I10" = hypertension). */
export const getConditionInfo = (icd10: string, max = 2) => lookup(ICD10_SYSTEM, icd10, max);

/** Plain-language drug info, by RxNorm id (from rxnorm.ts). */
export const getDrugInfo = (rxcui: string, max = 1) => lookup(RXNORM_SYSTEM, rxcui, max);

/**
 * MedlinePlus's spelling suggestion for a health term, e.g. "insomnea" -> "insomnia", "high blod presure" ->
 * "high blood pressure". null when the term is spelled right, has no suggestion, or the service is down.
 * Suggestions can be wrong ("dyarea" -> "daycare"), so callers should check how close they are (src/lib/spelling.ts).
 */
export async function getSpellingSuggestion(term: string): Promise<string | null> {
  const q = term.trim().slice(0, 100);
  if (q.length < 3) return null;
  const xml = await fetchText(
    `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&retmax=1&term=${encodeURIComponent(q)}`,
  );
  const hit = xml?.match(/<spellingCorrection[^>]*>([^<]+)<\/spellingCorrection>/)?.[1]?.trim().toLowerCase();
  return hit && hit !== q.toLowerCase() ? hit : null;
}
