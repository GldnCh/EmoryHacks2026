// Medicine search over our 38-medicine list. Owner: Jam.
// Two engines with the same output, so /api/medicines/search never breaks:
//   - Typesense (when TYPESENSE_HOST + TYPESENSE_API_KEY are set): typo-tolerant, ranked, facets, highlights.
//     The collection is enriched with every RxNorm brand name and the FDA "uses" text (scripts/seed-typesense.mjs).
//   - Local: a plain substring match over src/data/medicines.json, used when Typesense is missing or errors.
// Server-only (Typesense uses the admin key).
import data from "@/data/medicines.json";
import { getTypesense } from "@/lib/typesense";

export type Med = (typeof data.medicines)[number];

/** Fields Typesense searches, most important first (earlier fields rank higher). */
export const QUERY_BY = "genericName,allBrandNames,commonUses,drugClass,fdaUses";
const FACET_BY = "drugClass,prescriptionRequired";

export interface SearchFilters {
  rx?: boolean; // true = prescription only, false = over the counter only
  drugClass?: string; // exact class, e.g. "Antihistamine"
}

/** Where the query matched. `snippet` wraps the match in <mark>…</mark>; render it as text, not HTML. */
export interface Highlight {
  field: string;
  snippet: string;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface Facets {
  drugClass: FacetCount[];
  prescriptionRequired: FacetCount[]; // values "true" / "false"
}

export interface MedHit {
  med: Med;
  highlights: Highlight[];
}

export interface EngineResult {
  engine: "Typesense" | "Local list";
  hits: MedHit[];
  facets: Facets; // counts for the query *before* filters, so filter chips don't disappear when one is picked
  searchMs: number; // round trip of the search step, measured here
}

const byId = new Map(data.medicines.map((m) => [m.id, m]));

export function findMed(id: string): Med | undefined {
  return byId.get(id);
}

/** True if a medicine passes the optional filters. */
export function passesFilters(m: { prescriptionRequired: boolean; drugClass?: string }, f: SearchFilters) {
  if (f.rx !== undefined && m.prescriptionRequired !== f.rx) return false;
  if (f.drugClass && m.drugClass?.toLowerCase() !== f.drugClass.toLowerCase()) return false;
  return true;
}

/** Count drug classes and Rx/OTC across a set of medicines. */
export function countFacets(meds: Med[]): Facets {
  const count = (values: string[]) =>
    [...values.reduce((acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1), new Map<string, number>())]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return {
    drugClass: count(meds.map((m) => m.drugClass)),
    prescriptionRequired: count(meds.map((m) => String(m.prescriptionRequired))),
  };
}

// ---------- Typesense ----------

export const typesenseConfigured = () => Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY);

/** Typesense filter_by string. Backticks let class names contain spaces, commas or "&". */
function toFilterBy(f: SearchFilters): string | undefined {
  const parts: string[] = [];
  if (f.rx !== undefined) parts.push(`prescriptionRequired:=${f.rx}`);
  if (f.drugClass) parts.push(`drugClass:=\`${f.drugClass.replace(/`/g, "")}\``);
  return parts.length ? parts.join(" && ") : undefined;
}

type TsHit = {
  document: { id: string };
  highlights?: { field: string; snippet?: string; snippets?: string[] }[];
};
type TsFacet = { field_name: string; counts: { value: string; count: number }[] };
type TsResponse = { hits?: TsHit[]; facet_counts?: TsFacet[] };

function toHighlights(hit: TsHit): Highlight[] {
  return (hit.highlights ?? [])
    .map((h) => ({ field: h.field, snippet: h.snippet ?? h.snippets?.[0] ?? "" }))
    .filter((h) => h.snippet);
}

function toFacets(raw: TsFacet[] | undefined): Facets {
  const pick = (name: string) =>
    (raw?.find((f) => f.field_name === name)?.counts ?? []).map(({ value, count }) => ({ value, count }));
  return { drugClass: pick("drugClass"), prescriptionRequired: pick("prescriptionRequired") };
}

/** Search the "medicines" collection. Throws on any Typesense error; the caller falls back to local search. */
export async function searchTypesense(q: string, filters: SearchFilters = {}): Promise<EngineResult> {
  const started = performance.now();
  const docs = getTypesense().collections("medicines").documents();
  const base = {
    q,
    query_by: QUERY_BY,
    query_by_weights: "5,4,3,2,1",
    num_typos: 2, // "lisinoprl" -> lisinopril (2 is Typesense's maximum; longer typos go through src/lib/spelling.ts)
    typo_tokens_threshold: 1,
    facet_by: FACET_BY,
    max_facet_values: 20,
    highlight_fields: QUERY_BY,
    highlight_affix_num_tokens: 6,
    per_page: 20,
  };
  const filterBy = toFilterBy(filters);
  // With filters, run an unfiltered search alongside it just for the facet counts.
  const [main, unfiltered] = (await Promise.all([
    docs.search(filterBy ? { ...base, filter_by: filterBy } : base),
    filterBy ? docs.search({ ...base, per_page: 0 }) : Promise.resolve(null),
  ])) as [TsResponse, TsResponse | null];

  const hits = (main.hits ?? []).flatMap((h) => {
    const med = findMed(h.document.id);
    return med ? [{ med, highlights: toHighlights(h) }] : [];
  });
  return {
    engine: "Typesense",
    hits,
    facets: toFacets((unfiltered ?? main).facet_counts),
    searchMs: Math.round(performance.now() - started),
  };
}

// ---------- Local fallback ----------

const haystack = (m: Med) => [m.genericName, ...m.brandNames, m.drugClass, ...m.commonUses].join(" ").toLowerCase();

/** Substring search over our list. `alsoMatch` adds generic names from RxNorm (brand names, typos). */
export function searchLocal(q: string, filters: SearchFilters = {}, alsoMatch: string[] = []): EngineResult {
  const started = performance.now();
  const lower = q.toLowerCase();
  const extra = alsoMatch.map((s) => s.toLowerCase());
  const matched = data.medicines.filter(
    (m) => haystack(m).includes(lower) || extra.some((e) => m.genericName.toLowerCase().includes(e)),
  );
  return {
    engine: "Local list",
    hits: matched.filter((m) => passesFilters(m, filters)).map((med) => ({ med, highlights: [] })),
    facets: countFacets(matched),
    searchMs: Math.round(performance.now() - started),
  };
}

/** Words of a query or highlight, lowercase. */
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/**
 * True if the hit matched one of the query's words as typed (or as the start of a word, for search-as-you-type),
 * not only through a typo. Typo-only matches on a correctly spelled word are often wrong:
 * "acne" typo-matches "ACE inhibitor" and "aches". Hits without highlights (local list) count as exact.
 */
export function isExactHit(hit: MedHit, query: string): boolean {
  if (!hit.highlights.length) return true;
  const words = tokens(query);
  const marked = hit.highlights.flatMap((h) => [...h.snippet.matchAll(/<mark>(.*?)<\/mark>/g)].flatMap((m) => tokens(m[1])));
  return marked.some((m) => words.some((w) => m.startsWith(w) || (w.length >= 4 && w.startsWith(m))));
}
