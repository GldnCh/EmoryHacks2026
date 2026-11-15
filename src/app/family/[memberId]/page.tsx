"use client";
// One family member's profile (TD; sharing levels by Cam): conditions + medications (MedlinePlus), 12-month trends,
// and a single-day zoom. Each section shows only if this iPhone's owner may see it (yourself, or what they share).
// ?tab=bp|steps|heart|sleep|glucose opens the trends on that measure (default: BP for people with BP data).
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import DayCharts from "@/components/DayCharts";
import Disclaimer from "@/components/Disclaimer";
import { CalendarIcon, InfoIcon, PinIcon, StethoscopeIcon } from "@/components/Icons";
import { METRICS, type MetricKey } from "@/components/metrics";
import PageHeader from "@/components/PageHeader";
import SegmentedControl from "@/components/SegmentedControl";
import { fmt } from "@/components/StatTile";
import { CardSkeleton, ErrorNote, Skeleton, SourceBadge } from "@/components/Status";
import TrendChart, { type Marker, type Series } from "@/components/TrendChart";
import {
  monthLabel,
  monthLong,
  type ProfileResponse,
  type TrendRow,
  type TrendsResponse,
  type VitalsResponse,
} from "@/components/types";
import { useJson, type JsonState } from "@/components/useJson";
import Highlights from "@/components/Highlights";
import { usePeople, type PersonWithHealth } from "@/components/usePeople";
import { NotConnected, SetupPrompt } from "@/components/SetupPrompt";
import { BasicCard } from "@/components/PersonCards";
import MedReminders from "@/components/MedReminders";
import FamilyAlerts, { type AlertsResponse } from "@/components/FamilyAlerts";

const FIRST_DAY = "2025-11-01";
const LAST_DAY = "2026-10-31";

/** Days worth opening first: they show a story in the fabricated data. */
const EXAMPLE_DAYS: Record<string, { date: string; why: string }[]> = {
  jordan: [
    { date: "2026-01-27", why: "Flu: low steps, high heart rate" },
    { date: "2026-10-03", why: "Morning walk" },
  ],
  sam: [
    { date: "2026-10-03", why: "6 PM run" },
    { date: "2026-08-20", why: "Stressful month" },
  ],
  mia: [
    { date: "2026-10-14", why: "After-school sports" },
    { date: "2026-07-15", why: "Summer break" },
  ],
  rosa: [
    { date: "2026-07-15", why: "Summer blood pressure rise" },
    { date: "2026-10-03", why: "Gentle morning walk" },
  ],
};

/** The story each person's year tells, marked on their charts. */
const MARKERS: Record<string, Marker[]> = {
  jordan: [
    { from: "2026-01", label: "Flu", side: "left" },
    { from: "2026-03", label: "Starts walking", side: "right" },
  ],
  sam: [{ from: "2026-08", to: "2026-09", label: "Stress" }],
  mia: [{ from: "2026-06", to: "2026-08", label: "Summer" }],
  rosa: [
    { from: "2026-06", to: "2026-07", label: "BP rise" },
    { from: "2026-08", label: "Med review", side: "right" },
  ],
};

/** How each measure is charted in "12-month trends". */
const TREND_CHARTS: Record<
  MetricKey,
  { series: Series[]; unit: string; decimals: number; zeroBased?: boolean; yMin?: number; ariaLabel: string; value: (t: TrendRow) => string | null }
> = {
  steps: {
    series: [{ key: "avgSteps", name: "Steps" }],
    unit: "steps",
    decimals: 0,
    zeroBased: true,
    ariaLabel: "Average daily steps by month",
    value: (t) => fmt(t.avgSteps),
  },
  heart: {
    series: [{ key: "avgRestingHeartRate", name: "Resting heart rate" }],
    unit: "bpm",
    decimals: 1,
    ariaLabel: "Average resting heart rate by month",
    value: (t) => fmt(t.avgRestingHeartRate, 1),
  },
  sleep: {
    series: [{ key: "avgSleepHours", name: "Sleep" }],
    unit: "hr",
    decimals: 1,
    yMin: 5,
    ariaLabel: "Average hours of sleep by month",
    value: (t) => fmt(t.avgSleepHours, 1),
  },
  bp: {
    series: [
      { key: "avgSystolic", name: "Systolic (top)" },
      { key: "avgDiastolic", name: "Diastolic (bottom)" },
    ],
    unit: "mmHg",
    decimals: 0,
    ariaLabel: "Average systolic and diastolic blood pressure by month",
    value: (t) => (t.avgSystolic != null ? `${t.avgSystolic}/${t.avgDiastolic}` : null),
  },
  glucose: {
    series: [{ key: "avgBloodGlucose", name: "Fasting glucose" }],
    unit: "mg/dL",
    decimals: 0,
    ariaLabel: "Average fasting blood glucose by month",
    value: (t) => (t.avgBloodGlucose != null ? fmt(t.avgBloodGlucose) : null),
  },
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="-my-2 inline-flex min-h-11 items-center gap-1 text-footnote font-semibold text-brand hover:underline">
      {children} <span aria-hidden>↗</span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function HealthRecords({ data, p }: { data: ProfileResponse; p: PersonWithHealth }) {
  const row = "py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-line";
  const first = data.member.name.split(" ")[0];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {p.can("conditions") && (
      <Card title="Conditions">
        <ul>
          {data.conditions.map((c) => (
            <li key={c.name} className={row}>
              <p className="text-subhead font-semibold">
                {c.name}
                {c.plainName && c.plainName !== c.name && <span className="font-normal text-secondary"> ({c.plainName})</span>}
              </p>
              {c.specialty && <p className="mt-0.5 text-footnote text-secondary">Usually seen by: {c.specialty}</p>}
              {c.explanation && <ExternalLink href={c.explanation.url}>MedlinePlus: {c.explanation.title}</ExternalLink>}
            </li>
          ))}
          {data.conditions.length === 0 && <li className="text-subhead text-muted">None on file.</li>}
        </ul>
      </Card>
      )}
      {p.can("medications") && (
      <Card
        title="Medications"
        action={
          <Link href={`/medicines?member=${data.member.id}`} className="text-footnote font-semibold text-brand hover:underline">
            {p.person.self ? "See all your medicines" : `See all of ${first}'s medicines`}
          </Link>
        }
      >
        <ul>
          {data.medications.map((med) => (
            <li key={med.id} className={row}>
              <p className="text-subhead font-semibold">
                <Link href={`/medicines/${encodeURIComponent(med.id)}`} className="text-brand hover:underline">
                  {med.sample?.genericName ?? med.id}
                </Link>
                {med.sample?.brandNames.length ? <span className="font-normal text-secondary"> ({med.sample.brandNames.join(", ")})</span> : null}
              </p>
              {med.sample && <p className="mt-0.5 text-footnote text-secondary">{med.sample.drugClass}</p>}
              {med.info && <ExternalLink href={med.info.url}>MedlinePlus: {med.info.title}</ExternalLink>}
            </li>
          ))}
          {data.medications.length === 0 && <li className="text-subhead text-muted">None on file.</li>}
        </ul>
      </Card>
      )}
    </div>
  );
}

function YearTrends({ memberId, trends }: { memberId: string; trends: JsonState<TrendsResponse> }) {
  const { data, error, loading, status, retry } = trends;
  const requested = useSearchParams().get("tab");
  const [metric, setMetricState] = useState<MetricKey | null>(null);
  // A highlight card link (?tab=sleep) wins over an earlier tap on the segmented control.
  useEffect(() => setMetricState(null), [requested]);
  const setMetric = (k: MetricKey) => {
    setMetricState(k);
    // keep the URL shareable (?tab=bp) without a navigation
    const url = new URL(window.location.href);
    url.searchParams.set("tab", k);
    window.history.replaceState(null, "", url);
  };
  if (status === 404) return null; // unknown member: the page shows one "not found" message
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={3} />;

  const rows = data.trends as unknown as Record<string, unknown>[];
  const hasBP = data.trends.some((t) => t.avgSystolic != null);
  const hasGlucose = data.trends.some((t) => t.avgBloodGlucose != null);
  const keys: MetricKey[] = ["steps", "heart", "sleep", ...(hasBP ? (["bp"] as const) : []), ...(hasGlucose ? (["glucose"] as const) : [])];
  const fromUrl = keys.find((k) => k === requested);
  const active: MetricKey = metric && keys.includes(metric) ? metric : fromUrl ?? (hasBP ? "bp" : "steps");
  const chart = TREND_CHARTS[active];
  const first = data.trends[0];
  const last = data.trends.at(-1)!;

  return (
    <Card
      id="trends"
      title="12-month trends"
      subtitle={`Monthly averages, ${monthLong(first.month)} – ${monthLong(last.month)}`}
      action={<SourceBadge source={data.source} queryMs={data.queryMs} />}
    >
      <SegmentedControl
        ariaLabel="Choose a measure"
        controls="trend-panel"
        options={keys.map((k) => ({ value: k, label: METRICS[k].short }))}
        value={active}
        onChange={setMetric}
      />

      <div id="trend-panel" role="tabpanel" aria-label={METRICS[active].label} className="mt-5">
        <p className="flex items-center gap-1.5 text-footnote font-semibold text-secondary">
          <span style={{ color: METRICS[active].accent }}>{METRICS[active].icon}</span>
          {METRICS[active].label} · {monthLong(last.month)}
        </p>
        <p className="mt-1 font-[family-name:var(--font-rounded)] text-[34px] font-semibold leading-tight tracking-tight">
          {chart.value(last)}
          <span className="ml-1.5 font-sans text-subhead font-medium text-secondary">{chart.unit}</span>
        </p>
        <p className="mb-3 text-footnote text-muted">
          {monthLong(first.month)}: {chart.value(first)} {chart.unit}
        </p>
        <TrendChart
          key={active}
          data={rows}
          xKey="month"
          formatX={monthLabel}
          formatTooltipX={monthLong}
          markers={MARKERS[memberId] ?? []}
          series={chart.series}
          unit={chart.unit}
          decimals={chart.decimals}
          zeroBased={chart.zeroBased}
          yMin={chart.yMin}
          height={chart.series.length > 1 ? 270 : 240}
          ariaLabel={chart.ariaLabel}
        />
      </div>
    </Card>
  );
}

function DayZoom({ memberId }: { memberId: string }) {
  const examples = EXAMPLE_DAYS[memberId] ?? [];
  const [date, setDate] = useState(examples[0]?.date ?? LAST_DAY);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= FIRST_DAY && date <= LAST_DAY;
  const { data, error, loading, status, retry } = useJson<VitalsResponse>(valid ? `/api/vitals/${memberId}?date=${date}` : null);
  if (status === 404 && !data) return null; // unknown member: the page shows one "not found" message

  return (
    <Card title="Zoom into a day" subtitle="Hour by hour, rolled up from minute-by-minute readings" action={<SourceBadge source={data?.source} queryMs={data?.queryMs} />}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-h-11 items-center gap-2 self-start rounded-xl bg-fill pl-3 pr-1 text-subhead">
          <CalendarIcon size={18} className="text-muted" />
          <span className="sr-only">Date</span>
          <input
            type="date"
            min={FIRST_DAY}
            max={LAST_DAY}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 bg-transparent pr-2 font-semibold text-foreground outline-none"
          />
        </label>
        {examples.length > 0 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Example days">
            {examples.map((ex) => {
              const selected = ex.date === date;
              return (
                <button
                  key={ex.date}
                  onClick={() => setDate(ex.date)}
                  aria-pressed={selected}
                  className={`pressable min-h-11 shrink-0 rounded-full px-4 text-footnote font-semibold ${
                    selected ? "bg-brand text-white shadow-sm" : "bg-fill text-secondary hover:bg-[var(--fill-strong)]"
                  }`}
                >
                  {ex.why}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!valid ? (
        <p className="rounded-xl bg-warn-soft px-4 py-3 text-subhead font-medium text-warn">Pick a date between Nov 1, 2025 and Oct 31, 2026.</p>
      ) : error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : !data ? (
        <Skeleton className="h-60 w-full rounded-2xl" />
      ) : (
        <div className={`transition-opacity duration-300 ${loading ? "opacity-50" : ""}`}>
          <DayCharts hours={data.hours} />
        </div>
      )}
    </Card>
  );
}

/** One message for /family/<unknown id>, instead of an error in every card. */
function MemberNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/dashboard", label: "Dashboard" }} title="Family member not found" />
      <div role="alert" className="card flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-fill text-muted">
          <InfoIcon size={32} />
        </span>
        <h2 className="mt-5 text-title2">We couldn&apos;t find that person</h2>
        <p className="mt-2 max-w-sm text-subhead text-secondary">
          This link doesn&apos;t match anyone in the family. The demo includes Jordan, Sam, Mia and Rosa Rivera.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6">
          Back to the family dashboard
        </Link>
      </div>
    </div>
  );
}

export default function FamilyMemberPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { me, people } = usePeople();
  const p = people?.find((x) => x.member.id === memberId);
  // The profile route is public (names, conditions and medicines of the fictional family); trends and vitals are not.
  const { data, error, loading, status, retry } = useJson<ProfileResponse>(`/api/family/${memberId}/profile`);
  const alerts = useJson<AlertsResponse>(p ? "/api/alerts" : null);
  const trends = useJson<TrendsResponse>(p?.can("trends") ? `/api/trends/${memberId}` : null);
  const m = data?.member;

  if (status === 404) return <MemberNotFound />;

  const header = (
    <PageHeader
      back={{ href: "/dashboard", label: "Dashboard" }}
      title={m?.name ?? (error ? "Family member" : undefined)}
      leading={m ? <Avatar id={m.id} name={m.name} size={52} /> : undefined}
      subtitle={m && p ? `${p.label} · ${m.age} · ${m.location.city}, ${m.location.state}` : m ? `${m.location.city}, ${m.location.state}` : undefined}
    >
      {m && p && p.can("conditions") && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href={`/specialists?memberId=${m.id}`} className="btn btn-primary">
            <StethoscopeIcon size={18} />
            Find specialists near {m.location.city}
          </Link>
          {p.can("checkins") && (
            <Link href={`/family/${m.id}/report`} className="btn btn-secondary">
              Doctor report
            </Link>
          )}
          {m.relationship === "parent" && !p.person.self && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-footnote font-semibold text-[var(--brand-pressed)]">
              <PinIcon size={14} strokeWidth={2.2} /> Tracked remotely from {m.location.city}
            </span>
          )}
        </div>
      )}
    </PageHeader>
  );

  if (me && !me.setUp) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <SetupPrompt what="health details" />
      </div>
    );
  }
  if (!people || !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {error ? <ErrorNote message={error} onRetry={retry} /> : <CardSkeleton lines={2} />}
      </div>
    );
  }
  if (!p) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <NotConnected name={data.member.name} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}
      {/* Alerts first: an urgent one must never sit below a step count. */}
      {alerts.data && <FamilyAlerts data={alerts.data} onlyAccount={p.person.account.id} title="Alerts" />}
      {p.can("trends") && trends.data && trends.data.trends.length > 1 && (
        <Highlights trends={trends.data.trends} firstName={data.member.name.split(" ")[0]} self={p.person.self} memberId={memberId} />
      )}
      {!p.can("conditions") && !p.can("medications") && !p.can("trends") && <BasicCard p={p} />}
      {(p.can("conditions") || p.can("medications")) && (loading ? <CardSkeleton lines={2} /> : <HealthRecords data={data} p={p} />)}
      {p.can("reminders") && (
        <MedReminders memberId={memberId} firstName={data.member.name.split(" ")[0]} self={p.person.self} medicines={data.member.medications} />
      )}
      {p.can("trends") && <YearTrends memberId={memberId} trends={trends} />}
      {p.can("vitals") ? (
        <DayZoom memberId={memberId} />
      ) : p.can("trends") ? (
        <p className="card p-5 text-subhead text-secondary">
          {data.member.name.split(" ")[0]} shares a health summary with you: monthly trends, conditions and medicines. Day-by-day
          readings and check-ins stay private.
        </p>
      ) : null}
      <Disclaimer />
    </div>
  );
}
