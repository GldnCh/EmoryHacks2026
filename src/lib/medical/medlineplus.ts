// MedlinePlus Connect (National Library of Medicine): plain-language health info.
// Docs: https://medlineplus.gov/medlineplus-connect/web-service/  No key needed.
import { fetchJson, trimText } from "./http";

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
