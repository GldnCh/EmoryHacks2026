"use client";
// One medicine (Jam), from /api/medicines/<name>: our list + RxNorm names + the FDA label + MedlinePlus guide.
// "Explain this label simply" will call Ish's /api/ai/explain-label; it stays disabled until that route exists.
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Card from "@/components/Card";
import Disclaimer from "@/components/Disclaimer";
import { WarningIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { useJson } from "@/components/useJson";
import { RxBadge } from "../shared";

interface DetailResponse {
  query: string;
  sample: {
    id: string;
    genericName: string;
    brandNames: string[];
    drugClass: string;
    commonUses: string[];
    forms: string[];
    appearanceExample: string;
    prescriptionRequired: boolean;
    commonSideEffects: string[];
  } | null;
  rxnorm: { rxcui: string; ingredient: string; brandNames: string[] } | null;
  label: {
    genericName?: string;
    brandNames: string[];
    isPrescription: boolean;
    purpose?: string;
    indications?: string;
    boxedWarning?: string;
    warnings?: string;
    doNotUse?: string;
    askDoctor?: string;
    stopUse?: string;
    adverseReactions?: string;
    drugInteractions?: string;
    labelDate?: string;
    dailyMedUrl?: string;
  } | null;
  info: { title: string; summary?: string; url: string } | null;
  disclaimer: string;
}

const EXPLAIN_ROUTE = "/api/ai/explain-label";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-footnote font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="mt-1 text-subhead">{children}</div>
    </div>
  );
}

/** "20261014" -> "Oct 14, 2026" */
const labelDate = (d?: string) =>
  d && /^\d{8}$/.test(d)
    ? new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : undefined;

function ExplainButton({ name, label }: { name: string; label: DetailResponse["label"] }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<string | null>(null);

  // The route is POST-only once Ish adds it; a GET then answers 405, while a missing route answers 404.
  useEffect(() => {
    fetch(EXPLAIN_ROUTE)
      .then((r) => setAvailable(r.status !== 404))
      .catch(() => setAvailable(false));
  }, []);

  async function explain() {
    setBusy(true);
    try {
      const res = await fetch(EXPLAIN_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, label }),
      });
      const body = await res.json().catch(() => null);
      setText(body?.explanation ?? body?.text ?? body?.summary ?? body?.error ?? "No explanation came back. Try again later.");
    } catch {
      setText("Couldn't reach the explainer. Try again later.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={explain} disabled={!available || busy} className="btn btn-secondary self-start disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Explaining…" : "✨ Explain this label simply"}
      </button>
      {available === false && <p className="text-caption text-muted">AI explanations are coming soon.</p>}
      {text && <p className="rounded-2xl bg-fill px-4 py-3 text-subhead whitespace-pre-line">{text}</p>}
    </div>
  );
}

export default function MedicinePage() {
  const { name } = useParams<{ name: string }>();
  const { data, error, loading, status, retry } = useJson<DetailResponse>(`/api/medicines/${encodeURIComponent(decodeURIComponent(name))}`);

  const s = data?.sample;
  const l = data?.label;
  const title = s?.genericName ?? data?.rxnorm?.ingredient ?? l?.genericName?.toLowerCase();
  const brands = [...new Set([...(s?.brandNames ?? []), ...(data?.rxnorm?.brandNames ?? []), ...(l?.brandNames ?? [])])].slice(0, 12);
  const rx = s?.prescriptionRequired ?? l?.isPrescription;
  const uses = s?.commonUses.join(", ");
  const fdaUses = l?.indications ?? l?.purpose; // OTC "purpose" is just a class, e.g. "Antihistamine"

  if (status === 404) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader back={{ href: "/medicines", label: "Medicines" }} title="Not found" subtitle={`We couldn't find a medicine called "${decodeURIComponent(name)}".`} />
        <Disclaimer />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        back={{ href: "/medicines", label: "Medicines" }}
        title={title ? title.replace(/\b\w/g, (c) => c.toUpperCase()) : error ? "Medicine" : undefined}
        subtitle={s?.drugClass}
      >
        {rx !== undefined && (
          <div className="mt-2">
            <RxBadge rx={rx} />
          </div>
        )}
      </PageHeader>

      {error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : loading || !data ? (
        <CardSkeleton lines={3} />
      ) : (
        <>
          {l?.boxedWarning && (
            <section role="alert" className="flex gap-3 rounded-[20px] border-2 border-danger/40 bg-[#fdecea] p-5">
              <WarningIcon size={22} className="mt-0.5 shrink-0 text-danger" />
              <div className="min-w-0">
                <h2 className="text-headline text-danger">FDA boxed warning</h2>
                <p className="mt-1 text-subhead">{l.boxedWarning}</p>
              </div>
            </section>
          )}

          <Card title="Overview">
            <div className="flex flex-col gap-4">
              {brands.length > 0 && <Section title="Brand names">{brands.join(", ")}</Section>}
              {s?.drugClass && <Section title="Drug class">{s.drugClass}</Section>}
              {uses && <Section title="Commonly used for">{uses}</Section>}
              {fdaUses && <Section title="Uses (FDA label)">{fdaUses}</Section>}
              {s && (
                <Section title="Forms">
                  {s.forms.join(", ")}
                  <span className="block text-footnote text-secondary">
                    Example appearance: {s.appearanceExample}. Pills look different by maker and strength; confirm with your pharmacist.
                  </span>
                </Section>
              )}
            </div>
          </Card>

          {l && (l.warnings || l.doNotUse || l.askDoctor || l.stopUse) && (
            <Card title="Warnings" subtitle={l.labelDate ? `From the FDA label dated ${labelDate(l.labelDate)}` : "From the FDA label"}>
              <div className="flex flex-col gap-4">
                {l.warnings && <Section title="Warnings">{l.warnings}</Section>}
                {l.doNotUse && <Section title="Do not use">{l.doNotUse}</Section>}
                {l.askDoctor && <Section title="Ask a doctor before use">{l.askDoctor}</Section>}
                {l.stopUse && <Section title="Stop use and ask a doctor">{l.stopUse}</Section>}
              </div>
            </Card>
          )}

          {(s?.commonSideEffects.length || l?.adverseReactions) && (
            <Card title="Side effects">
              <div className="flex flex-col gap-4">
                {s?.commonSideEffects.length ? <Section title="Common">{s.commonSideEffects.join(", ")}</Section> : null}
                {l?.adverseReactions && <Section title="From the FDA label">{l.adverseReactions}</Section>}
              </div>
            </Card>
          )}

          {l?.drugInteractions && (
            <Card title="Interactions">
              <p className="text-subhead">{l.drugInteractions}</p>
            </Card>
          )}

          {data.info?.summary && (
            <Card title="In plain language" subtitle="MedlinePlus, National Library of Medicine">
              <p className="text-subhead">{data.info.summary}</p>
            </Card>
          )}

          <Card title="Learn more">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {l?.dailyMedUrl && (
                  <a href={l.dailyMedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Read the full FDA label ↗
                  </a>
                )}
                {data.info?.url && (
                  <a href={data.info.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    Plain-language guide ↗
                  </a>
                )}
              </div>
              <ExplainButton name={title ?? data.query} label={l ?? null} />
            </div>
          </Card>

          <p className="text-footnote text-secondary">{data.disclaimer}</p>
        </>
      )}
      <Disclaimer />
    </div>
  );
}
