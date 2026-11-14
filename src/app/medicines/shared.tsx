// Shared pieces for the medicine pages (Jam): API response types, the Rx/OTC badge, and highlight rendering.

export interface FacetCount {
  value: string;
  count: number;
}

export interface SearchResult {
  id?: string;
  name: string;
  brandNames: string[];
  drugClass?: string;
  uses?: string[] | string;
  prescriptionRequired: boolean;
  source: "iCare sample list" | "openFDA";
  highlights: { field: string; snippet: string }[];
}

export interface SearchResponse {
  query: string;
  rxnorm: { rxcui: string; ingredient: string; brandNames: string[]; matchedFrom: string } | null;
  count: number;
  results: SearchResult[];
  source: "Typesense" | "Local list";
  facets: { drugClass: FacetCount[]; prescriptionRequired: FacetCount[] };
  searchMs: number;
  disclaimer: string;
}

export function RxBadge({ rx }: { rx: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-caption font-semibold ${
        rx ? "bg-warn-soft text-warn" : "bg-good-soft text-good"
      }`}
    >
      {rx ? "Prescription" : "Over the counter"}
    </span>
  );
}

/** Renders a Typesense snippet ("… <mark>Zyrtec</mark> …") as text with <mark>, without injecting HTML. */
export function Highlighted({ snippet }: { snippet: string }) {
  const parts = snippet.split(/(<mark>.*?<\/mark>)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("<mark>") ? (
          <mark key={i} className="rounded bg-brand-soft px-0.5 text-foreground">
            {p.slice(6, -7)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
