"use client";
// Medicine search (Jam). Live results from /api/medicines/search as you type (debounced),
// filter chips from the facets, Rx/OTC badges, and voice search with the browser's Web Speech API.
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Disclaimer from "@/components/Disclaimer";
import { BoltIcon, ChevronRight } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { ErrorNote, Skeleton } from "@/components/Status";
import FamilyMedicines from "./FamilyMedicines";
import { Highlighted, RxBadge, type SearchResponse, type SearchResult } from "./shared";

const EXAMPLES = ["zyrtec", "wal-zyr", "heartburn", "insomnia", "lisinoprl"];

// ---------- voice search (Web Speech API) ----------

type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function VoiceButton({ onText }: { onText: (t: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => setSupported(Boolean(getRecognition())), []);
  useEffect(() => () => rec.current?.stop(), []);
  if (!supported) return null;

  function toggle() {
    if (listening) return rec.current?.stop();
    const Ctor = getRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript?.trim();
      if (text) onText(text.replace(/[.?!]$/, ""));
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Microphone permission was denied." : "Didn't catch that. Try again.");
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Search by voice"}
        title={listening ? "Stop listening" : "Search by voice"}
        className={`pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl ${
          listening ? "animate-pulse bg-danger text-white" : "bg-brand-soft hover:bg-fill"
        }`}
      >
        <span aria-hidden>🎤</span>
      </button>
      <span role="status" className="sr-only">
        {listening ? "Listening" : ""}
      </span>
      {error && <p className="basis-full text-footnote text-danger">{error}</p>}
    </>
  );
}

// ---------- filter chips ----------

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable min-h-9 shrink-0 rounded-full px-3.5 text-footnote font-semibold ${
        active ? "bg-brand text-white" : "bg-surface text-secondary shadow-card hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The one highlight worth showing: a brand we don't list on the card ("Wal-Zyr"), or the FDA label text
 * when nothing visible (name, uses, class) matched. Otherwise the card already shows why it matched.
 */
function whyMatched(r: SearchResult) {
  const visible = r.highlights.some((h) => ["genericName", "commonUses", "drugClass"].includes(h.field));
  const brand = r.highlights.find((h) => h.field === "allBrandNames");
  const brandText = brand?.snippet.replace(/<\/?mark>/g, "").toLowerCase();
  if (brand && !r.brandNames.some((b) => b.toLowerCase() === brandText)) return brand;
  if (!visible && !brand) return r.highlights.find((h) => h.field === "fdaUses");
  return undefined;
}

// ---------- page ----------

function MedicineSearch() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [rx, setRx] = useState<boolean | undefined>(undefined);
  const [drugClass, setDrugClass] = useState<string | undefined>(undefined);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Changing the words clears the filters (their facets belong to the old query).
  function updateQuery(next: string) {
    setQ(next);
    setRx(undefined);
    setDrugClass(undefined);
  }

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      // keep the query in the URL so a search can be shared or reloaded (only when it changed:
      // Next's router listens to replaceState, so writing the same URL would re-render for nothing)
      const url = new URL(window.location.href);
      if (url.searchParams.get("q") !== term) {
        url.searchParams.set("q", term);
        window.history.replaceState(null, "", url);
      }
      const sp = new URLSearchParams({ q: term });
      if (rx !== undefined) sp.set("rx", String(rx));
      if (drugClass) sp.set("class", drugClass);
      fetch(`/api/medicines/search?${sp}`, { signal: ctrl.signal })
        .then(async (res) => {
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error ?? `The server answered ${res.status}.`);
          setData(body as SearchResponse);
          setError(null);
        })
        .catch((err: unknown) => {
          if (!ctrl.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong.");
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, rx, drugClass, attempt]);

  const term = q.trim();
  const rxCount = data?.facets.prescriptionRequired.find((f) => f.value === "true")?.count ?? 0;
  const otcCount = data?.facets.prescriptionRequired.find((f) => f.value === "false")?.count ?? 0;
  const rxMatch = data?.rxnorm && data.rxnorm.ingredient.toLowerCase() !== data.query.toLowerCase() ? data.rxnorm.ingredient : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Medicines"
        subtitle="Search by brand, generic name or what it's for. Typos are fine. Tap 🎤 to search by voice."
      />

      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-2">
        <label htmlFor="med-q" className="sr-only">
          Search medicines
        </label>
        <input
          id="med-q"
          type="search"
          value={q}
          onChange={(e) => updateQuery(e.target.value)}
          placeholder="e.g. Zyrtec, heartburn, lisinopril"
          autoComplete="off"
          autoFocus
          className="min-h-11 min-w-0 flex-1 rounded-full bg-surface px-5 text-[17px] shadow-card outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand/50"
        />
        <VoiceButton onText={updateQuery} />
      </form>

      {!term && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-footnote text-muted">Try:</span>
          {EXAMPLES.map((ex) => (
            <Chip key={ex} active={false} onClick={() => updateQuery(ex)}>
              {ex}
            </Chip>
          ))}
        </div>
      )}

      {data && term.length >= 2 && (
        <>
          {/* filter chips from the facets */}
          {(rxCount > 0 || otcCount > 0 || data.facets.drugClass.length > 1) && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filters">
              <Chip active={rx === undefined && !drugClass} onClick={() => (setRx(undefined), setDrugClass(undefined))}>
                All
              </Chip>
              {rxCount > 0 && (
                <Chip active={rx === true} onClick={() => setRx(rx === true ? undefined : true)}>
                  Prescription · {rxCount}
                </Chip>
              )}
              {otcCount > 0 && (
                <Chip active={rx === false} onClick={() => setRx(rx === false ? undefined : false)}>
                  Over the counter · {otcCount}
                </Chip>
              )}
              {data.facets.drugClass.length > 1 &&
                data.facets.drugClass.map((f) => (
                  <Chip key={f.value} active={drugClass === f.value} onClick={() => setDrugClass(drugClass === f.value ? undefined : f.value)}>
                    {f.value} · {f.count}
                  </Chip>
                ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-secondary" aria-live="polite">
            <span>
              {data.count} result{data.count === 1 ? "" : "s"}
              {rxMatch && (
                <>
                  {" "}
                  · Showing results for <strong className="text-foreground">{rxMatch}</strong> (you searched &ldquo;{data.query}&rdquo;)
                </>
              )}
            </span>
            {data.source === "Typesense" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-caption font-semibold text-[var(--brand-pressed)]">
                <BoltIcon size={13} strokeWidth={2.2} /> Typesense · {data.searchMs} ms
              </span>
            )}
          </div>
        </>
      )}

      {error ? (
        <ErrorNote message={error} onRetry={() => setAttempt((a) => a + 1)} />
      ) : loading && !data && term.length >= 2 ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Searching">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
          ))}
        </div>
      ) : data && term.length >= 2 ? (
        data.results.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-headline">No medicines found for &ldquo;{data.query}&rdquo;</p>
            <p className="mt-1 text-footnote text-secondary">Check the spelling, try the generic name, or describe what it treats.</p>
          </div>
        ) : (
          <ul className={`flex flex-col gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {data.results.map((r) => {
              const href = `/medicines/${encodeURIComponent(r.id ?? r.name.toLowerCase())}`;
              const uses = Array.isArray(r.uses) ? r.uses.join(", ") : r.uses;
              const hl = whyMatched(r);
              return (
                <li key={`${r.source}-${r.id ?? r.name}`}>
                  <Link href={href} className="card pressable group flex items-start gap-3 p-4 hover:shadow-raised sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-headline capitalize">{r.name.toLowerCase()}</h2>
                        <RxBadge rx={r.prescriptionRequired} />
                      </div>
                      {r.brandNames.length > 0 && (
                        <p className="mt-0.5 truncate text-footnote text-secondary">Brands: {r.brandNames.slice(0, 5).join(", ")}</p>
                      )}
                      {uses && (
                        <p className="mt-1.5 line-clamp-2 text-subhead">
                          {r.drugClass && <span className="text-muted">{r.drugClass} · </span>}
                          {uses}
                        </p>
                      )}
                      {hl && (
                        <p className="mt-1.5 line-clamp-2 text-footnote text-secondary">
                          <span className="text-muted">{hl.field === "allBrandNames" ? "Matched brand: " : "FDA label: "}</span>
                          <Highlighted snippet={hl.snippet} />
                        </p>
                      )}
                      {r.source === "openFDA" && <p className="mt-1.5 text-caption text-muted">From an FDA label (openFDA); may include older products.</p>}
                    </div>
                    <ChevronRight size={18} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {/* Family medicines: under the search box until you search, then below the results (CSS order, so it
          doesn't remount and keeps the selected member) */}
      <div className={term ? "order-1" : ""}>
        <FamilyMedicines initialMember={params.get("member")} />
      </div>

      {data && <p className="order-2 text-footnote text-secondary">{data.disclaimer}</p>}
      <Disclaimer className="order-2" />
    </div>
  );
}

export default function MedicinesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-11 w-full rounded-full" />}>
      <MedicineSearch />
    </Suspense>
  );
}
