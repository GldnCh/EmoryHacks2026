"use client";
// One family member's profile (TD; sharing levels and "what matters most" cards by Cam).
// Alerts first, then cards ordered for this person: measures linked to their conditions, then what changed most,
// medicines, check-ins, conditions and the day zoom. Each card shows one key thing and opens in place for details.
// Each card only shows if this iPhone's owner may see it (yourself, or what they share).
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Card from "@/components/Card";
import DayCharts from "@/components/DayCharts";
import Disclaimer from "@/components/Disclaimer";
import { CalendarIcon, InfoIcon, PillIcon, PinIcon, StethoscopeIcon, VideoIcon } from "@/components/Icons";
import { METRICS, type MetricKey } from "@/components/metrics";
import PageHeader from "@/components/PageHeader";
import { STEADY_FRACTION, fmt } from "@/components/StatTile";
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
import { useJson } from "@/components/useJson";
import Portrait from "@/components/Portrait";
import WarmArt from "@/components/WarmArt";
import { StatusPill } from "@/components/FamilyAlerts";
import ProfileTiles, { type TileSpec, type Tone } from "@/components/ProfileTiles";
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

const ROW = "py-3 first:pt-0 last:pb-0 [&+&]:border-t [&+&]:border-line";

function ConditionList({ data }: { data: ProfileResponse }) {
  return (
    <ul>
      {data.conditions.map((c) => (
        <li key={c.name} className={ROW}>
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
  );
}

function MedicationList({ data }: { data: ProfileResponse }) {
  return (
    <ul>
      {data.medications.map((med) => (
        <li key={med.id} className={ROW}>
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
  );
}

const BETTER_WHEN: Record<MetricKey, "up" | "down"> = { steps: "up", sleep: "up", heart: "down", bp: "down", glucose: "down" };
const GET: Record<MetricKey, (t: TrendRow) => number | undefined> = {
  steps: (t) => t.avgSteps,
  heart: (t) => t.avgRestingHeartRate,
  sleep: (t) => t.avgSleepHours,
  bp: (t) => t.avgSystolic,
  glucose: (t) => t.avgBloodGlucose,
};

function change(key: MetricKey, rows: TrendRow[]) {
  const last = GET[key](rows.at(-1)!), prev = rows.length > 1 ? GET[key](rows.at(-2)!) : undefined;
  if (last == null || prev == null) return null;
  const diff = last - prev, size = prev ? Math.abs(diff / prev) : 0;
  if (size < STEADY_FRACTION) return { arrow: "→", word: "Steady", tone: "flat" as Tone, size, worse: false };
  const better = BETTER_WHEN[key] === "up" ? diff > 0 : diff < 0;
  return { arrow: diff > 0 ? "↑" : "↓", word: better ? "Improving" : "Worsening", tone: (better ? "good" : "warn") as Tone, size, worse: !better };
}

/** Full chart + the year's low / high / average for one measure (the open state of a card). */
function MetricDetail({ metric, rows, memberId, source, queryMs }: { metric: MetricKey; rows: TrendRow[]; memberId: string; source?: string; queryMs?: number }) {
  const chart = TREND_CHARTS[metric];
  const vals = rows.map(GET[metric]).filter((v): v is number => v != null);
  const d = chart.decimals;
  const stats = vals.length
    ? [
        { label: "12-month low", v: fmt(Math.min(...vals), d) },
        { label: "12-month high", v: fmt(Math.max(...vals), d) },
        { label: "Average", v: fmt(vals.reduce((a, b) => a + b, 0) / vals.length, d) },
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-footnote text-secondary">
          Monthly averages, {monthLong(rows[0].month)} – {monthLong(rows.at(-1)!.month)}
        </p>
        <SourceBadge source={source} queryMs={queryMs} />
      </div>
      <TrendChart
        data={rows as unknown as Record<string, unknown>[]}
        xKey="month"
        formatX={monthLabel}
        formatTooltipX={monthLong}
        markers={MARKERS[memberId] ?? []}
        series={chart.series}
        unit={chart.unit}
        decimals={chart.decimals}
        zeroBased={chart.zeroBased}
        yMin={chart.yMin}
        height={chart.series.length > 1 ? 250 : 220}
        ariaLabel={chart.ariaLabel}
      />
      {stats.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((x) => (
            <div key={x.label} className="rounded-2xl bg-[var(--surface-muted)] p-3 text-center">
              <dt className="text-caption text-muted">{x.label}</dt>
              <dd className="mt-0.5 font-[family-name:var(--font-rounded)] text-headline">
                {x.v} <span className="text-caption font-normal text-secondary">{chart.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

interface Checkin {
  id: number;
  startedAt: string;
  points: string[];
  nextStep: string;
  emergency: boolean;
}

/** Builds the cards for one person and decides their order (weights). */
function buildTiles(o: {
  p: PersonWithHealth;
  data: ProfileResponse;
  rows: TrendRow[] | null;
  source?: string;
  queryMs?: number;
  reminders: { schedules: unknown[]; adherence: { percent: number | null; missed: number } } | null;
  checkins: Checkin[] | null;
}): TileSpec[] {
  const { p, data, rows } = o;
  const first = data.member.name.split(" ")[0];
  const cond = data.member.conditions.join(" ").toLowerCase();
  const tiles: TileSpec[] = [];

  if (rows && rows.length > 1 && p.can("trends")) {
    const keys = (Object.keys(METRICS) as MetricKey[]).filter((k) => GET[k](rows.at(-1)!) != null);
    const changes = Object.fromEntries(keys.map((k) => [k, change(k, rows)]));
    const biggestWorse = keys.filter((k) => changes[k]?.worse).sort((a, b) => (changes[b]?.size ?? 0) - (changes[a]?.size ?? 0))[0];
    for (const k of keys) {
      let weight = k === "steps" || k === "sleep" ? 2 : 1.5;
      let why: string | undefined;
      if (k === "bp" && cond.includes("hypertension")) {
        weight += 5;
        why = cond.includes("mild hypertension") ? "Linked to mild high blood pressure" : "Linked to high blood pressure";
      }
      if (k === "glucose" && (cond.includes("diabetes") || cond.includes("prediabetes"))) {
        weight += 5;
        why = cond.includes("prediabetes") ? "Linked to prediabetes" : "Linked to diabetes";
      }
      if (k === "steps" && /diabetes|hypertension/.test(cond)) weight += 1;
      if (k === "heart" && cond.includes("cholesterol")) weight += 1;
      const c = changes[k];
      if (k === biggestWorse) {
        weight += 2.5;
        why ??= "Changed most this month";
      } else if (c?.tone === "good" && (c.size ?? 0) > 0.05) weight += 0.5;
      const last = rows.at(-1)!;
      tiles.push({
        key: k,
        title: METRICS[k].label,
        icon: METRICS[k].icon,
        accent: METRICS[k].accent,
        weight,
        why,
        value: TREND_CHARTS[k].value(last) ?? "–",
        unit: TREND_CHARTS[k].unit,
        trend: c ? { arrow: c.arrow, word: c.word, tone: c.tone } : undefined,
        spark: rows.map(GET[k]).filter((v): v is number => v != null),
        detail: <MetricDetail metric={k} rows={rows} memberId={data.member.id} source={o.source} queryMs={o.queryMs} />,
      });
    }
  }

  if (p.can("medications")) {
    const r = o.reminders;
    const hasSchedule = !!r && r.schedules.length > 0;
    const missed = r?.adherence.missed ?? 0;
    tiles.push({
      key: "medicines",
      title: "Medicines",
      icon: <PillIcon size={15} strokeWidth={2.2} />,
      accent: "#b84a14",
      weight: hasSchedule ? 3 + Math.min(missed, 4) : 1.4,
      why: hasSchedule ? (missed ? `${missed} dose${missed > 1 ? "s" : ""} missed this week` : "All doses taken this week") : undefined,
      summary: (
        <>
          {data.medications.length} medicine{data.medications.length === 1 ? "" : "s"}
          {hasSchedule && r!.adherence.percent != null && <span className="text-secondary"> · {r!.adherence.percent}% taken this week</span>}
        </>
      ),
      detail: (
        <div className="flex flex-col gap-5">
          {p.can("reminders") && <MedReminders bare memberId={data.member.id} firstName={first} self={p.person.self} medicines={data.member.medications} />}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-footnote font-semibold uppercase tracking-wide text-muted">Prescribed</h3>
              <Link href={`/medicines?member=${data.member.id}`} className="text-footnote font-semibold text-brand hover:underline">
                {p.person.self ? "See all your medicines" : `See all of ${first}'s medicines`}
              </Link>
            </div>
            <MedicationList data={data} />
          </div>
        </div>
      ),
    });
  }

  if (p.can("checkins") && o.checkins) {
    const latest = o.checkins[0];
    const recentEmergency = latest?.emergency && Date.now() - new Date(latest.startedAt).getTime() < 7 * 86400_000;
    tiles.push({
      key: "checkins",
      title: "Check-ins",
      icon: <VideoIcon size={15} strokeWidth={2.2} />,
      accent: "#2a78d6",
      weight: recentEmergency ? 9 : latest ? 2.5 : 0.8,
      why: recentEmergency ? "Emergency symptoms mentioned" : latest ? `Last one ${new Date(latest.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : undefined,
      summary: latest ? <span className="line-clamp-2">{latest.points[0]}</span> : <span className="text-secondary">No check-ins yet</span>,
      detail: latest ? (
        <ul className="flex flex-col gap-3">
          {o.checkins.slice(0, 5).map((c) => (
            <li key={c.id} className="rounded-2xl bg-[var(--surface-muted)] p-4">
              <p className="text-subhead font-semibold">
                {new Date(c.startedAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {c.emergency && <span className="ml-2 text-danger">Emergency symptoms mentioned</span>}
              </p>
              <ul className="ml-5 mt-2 list-disc text-subhead">
                {c.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <p className="mt-2 text-footnote text-secondary">Next step: {c.nextStep}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-subhead text-secondary">
          No check-ins yet. <Link href="/checkin#facetime" className="font-semibold text-brand">FaceTime iCare</Link> to start one.
        </p>
      ),
    });
  }

  if (p.can("conditions")) {
    tiles.push({
      key: "conditions",
      title: "Conditions",
      icon: <StethoscopeIcon size={15} strokeWidth={2.2} />,
      accent: "#7148cf",
      weight: 1.2,
      summary: <span className="line-clamp-2">{data.member.conditions.join(", ") || "None on file"}</span>,
      detail: (
        <div className="flex flex-col gap-3">
          <ConditionList data={data} />
          <Link href={`/specialists?memberId=${data.member.id}`} className="btn btn-secondary self-start">
            <StethoscopeIcon size={18} />
            Find specialists near {data.member.location.city}
          </Link>
        </div>
      ),
    });
  }

  if (p.can("vitals")) {
    tiles.push({
      key: "day",
      title: "Zoom into a day",
      icon: <CalendarIcon size={15} strokeWidth={2.2} />,
      accent: "#16a37a",
      weight: 0.5,
      summary: <span className="text-secondary">Hour-by-hour heart rate and steps for any day</span>,
      detail: <DayZoom bare memberId={data.member.id} />,
    });
  }
  return tiles;
}

/** Content without the card frame, for use inside a profile card. */
function BareCard({ children }: { children: React.ReactNode; title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return <div>{children}</div>;
}

function DayZoom({ memberId, bare = false }: { memberId: string; bare?: boolean }) {
  const Wrapper = (bare ? BareCard : Card) as typeof Card;
  const examples = EXAMPLE_DAYS[memberId] ?? [];
  const [date, setDate] = useState(examples[0]?.date ?? LAST_DAY);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= FIRST_DAY && date <= LAST_DAY;
  const { data, error, loading, status, retry } = useJson<VitalsResponse>(valid ? `/api/vitals/${memberId}?date=${date}` : null);
  if (status === 404 && !data) return null; // unknown member: the page shows one "not found" message

  return (
    <Wrapper title="Zoom into a day" subtitle="Hour by hour, rolled up from minute-by-minute readings" action={<SourceBadge source={data?.source} queryMs={data?.queryMs} />}>
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
    </Wrapper>
  );
}

/** One message for /family/<unknown id>, instead of an error in every card. */
function MemberNotFound() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader back={{ href: "/dashboard", label: "Dashboard" }} title="Family member not found" />
      <div role="alert" className="card flex flex-col items-center px-6 py-10 text-center">
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
  const reminders = useJson<{ schedules: unknown[]; adherence: { percent: number | null; missed: number } }>(
    p?.can("reminders") ? `/api/reminders/${memberId}?days=7` : null,
  );
  const checkins = useJson<{ checkins: Checkin[] }>(p?.can("checkins") ? `/api/checkins/${memberId}` : null);
  const m = data?.member;

  if (status === 404) return <MemberNotFound />;

  const pill =
    "pressable inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-footnote font-semibold border border-white/60 shadow-[0_6px_16px_rgba(170,70,20,0.12)] backdrop-blur-md";
  const personStatus = p && alerts.data?.people.find((x) => x.accountId === p.person.account.id);
  const header = (
    <PageHeader
      back={{ href: "/", label: m ? m.name.split(" ")[0] : "Family" }}
      title={m?.name ?? (error ? "Family member" : undefined)}
      leading={
        m ? (
          <span className="grid h-[72px] w-[72px] shrink-0 place-items-end justify-center overflow-hidden rounded-full border border-white/70 bg-white/55 shadow-[0_8px_20px_rgba(170,70,20,0.18)] backdrop-blur-md sm:h-20 sm:w-20">
            <Portrait id={m.id} size={86} className="-mb-1" />
          </span>
        ) : undefined
      }
      subtitle={m && p ? `${p.label} · ${m.age} · ${m.location.city}, ${m.location.state}` : m ? `${m.location.city}, ${m.location.state}` : undefined}
    >
      {m && p && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {personStatus && <StatusPill status={personStatus.status} text={personStatus.statusText} />}
          {m.relationship === "parent" && !p.person.self && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/55 px-2.5 py-1 text-caption font-semibold text-[var(--brand-pressed)] backdrop-blur-md">
              <PinIcon size={13} strokeWidth={2.2} /> Remote, {m.location.city}
            </span>
          )}
        </div>
      )}
      {m && p && p.can("conditions") && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={`/specialists?memberId=${m.id}`} className={`${pill} bg-[var(--brand)] text-white`}>
            <StethoscopeIcon size={16} />
            Specialists
          </Link>
          {p.can("checkins") && (
            <Link href={`/family/${m.id}/report`} className={`${pill} bg-white/65 text-[var(--brand-pressed)]`}>
              Doctor report
            </Link>
          )}
        </div>
      )}
    </PageHeader>
  );

  if (me && !me.setUp) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        {header}
        <SetupPrompt what="health details" />
      </div>
    );
  }
  if (!people || !data) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        {header}
        {error ? <ErrorNote message={error} onRetry={retry} /> : <CardSkeleton lines={2} />}
      </div>
    );
  }
  if (!p) {
    return (
      <div className="flex flex-col gap-4 sm:gap-5">
        {header}
        <NotConnected name={data.member.name} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <section className="relative -mx-4 -mt-2 overflow-hidden px-4 pb-6 pt-1 sm:mx-0 sm:mt-0 sm:rounded-[36px] sm:p-7 sm:shadow-[0_30px_60px_rgba(170,70,20,0.16)]">
        <WarmArt />
        <div className="relative grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-3 lg:sticky lg:top-20">
            <div className="rounded-[26px] border border-white/60 bg-white/45 px-4 pb-4 pt-2 shadow-[0_14px_34px_rgba(170,70,20,0.14),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
              {header}
            </div>
            {/* Alerts first: an urgent one must never sit below a step count. */}
            {alerts.data && <FamilyAlerts glass data={alerts.data} onlyAccount={p.person.account.id} title="Alerts" />}
            {!p.can("conditions") && !p.can("medications") && !p.can("trends") && <BasicCard p={p} />}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            {(p.can("trends") || p.can("medications") || p.can("conditions")) &&
              (loading || (p.can("trends") && !trends.data && !trends.error) ? (
                <CardSkeleton lines={3} />
              ) : (
                <ProfileTiles
                  glass
                  title={p.person.self ? "What matters most for you" : `What matters most for ${data.member.name.split(" ")[0]}`}
                  subtitle={`Ordered by ${p.person.self ? "your" : data.member.name.split(" ")[0] + "'s"} conditions and what changed recently. Tap a card for details.`}
                  tiles={buildTiles({
                    p,
                    data,
                    rows: trends.data?.trends ?? null,
                    source: trends.data?.source,
                    queryMs: trends.data?.queryMs,
                    reminders: reminders.data,
                    checkins: checkins.data?.checkins ?? null,
                  })}
                />
              ))}
            {p.can("trends") && !p.can("vitals") && (
              <p className="rounded-[22px] border border-white/60 bg-white/60 p-4 text-footnote text-secondary backdrop-blur-xl">
                {data.member.name.split(" ")[0]} shares a health summary with you: monthly trends, conditions and medicines. Day-by-day
                readings and check-ins stay private.
              </p>
            )}
          </div>
        </div>
      </section>
      <Disclaimer />
    </div>
  );
}
