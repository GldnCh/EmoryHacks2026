"use client";
// One family member's profile (TD): conditions + medications (MedlinePlus), 12-month trends, and a single-day zoom.
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import Card from "@/components/Card";
import DayCharts from "@/components/DayCharts";
import Disclaimer from "@/components/Disclaimer";
import { CardSkeleton, ErrorNote, Skeleton, SourceBadge } from "@/components/Status";
import TrendChart, { type Marker } from "@/components/TrendChart";
import {
  RELATIONSHIP,
  monthLabel,
  monthLong,
  type ProfileResponse,
  type TrendsResponse,
  type VitalsResponse,
} from "@/components/types";
import { useJson } from "@/components/useJson";

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

function ProfileHeader({ memberId }: { memberId: string }) {
  const { data, error, loading, retry } = useJson<ProfileResponse>(`/api/family/${memberId}/profile`);
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={2} />;
  const m = data.member;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{m.name}</h1>
          <p className="text-sm text-secondary">
            {RELATIONSHIP[m.relationship]} · {m.age} · {m.location.city}, {m.location.state}
          </p>
          {m.relationship === "parent" && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              <span aria-hidden>📍</span> Tracked remotely from {m.location.city}
            </p>
          )}
        </div>
        <Link
          href={`/specialists?memberId=${m.id}`}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Find specialists near {m.location.city}
        </Link>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold">Conditions</h2>
          <ul className="flex flex-col gap-2">
            {data.conditions.map((c) => (
              <li key={c.name} className="rounded-xl bg-surface-muted p-3 text-sm">
                <p className="font-medium">
                  {c.name}
                  {c.plainName && c.plainName !== c.name && <span className="font-normal text-secondary"> ({c.plainName})</span>}
                </p>
                {c.specialty && <p className="text-xs text-secondary">Usually seen by: {c.specialty}</p>}
                {c.explanation && (
                  <a href={c.explanation.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand underline">
                    MedlinePlus: {c.explanation.title} ↗
                  </a>
                )}
              </li>
            ))}
            {data.conditions.length === 0 && <li className="text-sm text-muted">None on file.</li>}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold">Medications</h2>
          <ul className="flex flex-col gap-2">
            {data.medications.map((med) => (
              <li key={med.id} className="rounded-xl bg-surface-muted p-3 text-sm">
                <p className="font-medium">
                  {med.sample?.genericName ?? med.id}
                  {med.sample?.brandNames.length ? (
                    <span className="font-normal text-secondary"> ({med.sample.brandNames.join(", ")})</span>
                  ) : null}
                </p>
                {med.sample && <p className="text-xs text-secondary">{med.sample.drugClass}</p>}
                {med.info && (
                  <a href={med.info.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-medium text-brand underline">
                    MedlinePlus: {med.info.title} ↗
                  </a>
                )}
              </li>
            ))}
            {data.medications.length === 0 && <li className="text-sm text-muted">None on file.</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function YearTrends({ memberId }: { memberId: string }) {
  const { data, error, loading, retry } = useJson<TrendsResponse>(`/api/trends/${memberId}`);
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={3} />;

  const rows = data.trends as unknown as Record<string, unknown>[];
  const markers = MARKERS[memberId] ?? [];
  const hasBP = data.trends.some((t) => t.avgSystolic != null);
  const hasGlucose = data.trends.some((t) => t.avgBloodGlucose != null);
  const common = { data: rows, xKey: "month", formatX: monthLabel, formatTooltipX: monthLong, markers };
  const first = data.trends[0];
  const last = data.trends.at(-1)!;

  return (
    <Card
      title="12-month trends"
      subtitle={`Monthly averages, ${monthLong(first.month)} – ${monthLong(last.month)}`}
      action={<SourceBadge source={data.source} queryMs={data.queryMs} />}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium">Steps per day</h3>
          <TrendChart {...common} series={[{ key: "avgSteps", name: "Steps" }]} unit="steps" zeroBased ariaLabel="Average daily steps by month" />
        </div>
        <div>
          <h3 className="text-sm font-medium">Resting heart rate</h3>
          <TrendChart {...common} series={[{ key: "avgRestingHeartRate", name: "Resting heart rate" }]} unit="bpm" decimals={1} ariaLabel="Average resting heart rate by month" />
        </div>
        <div>
          <h3 className="text-sm font-medium">Sleep</h3>
          <TrendChart {...common} series={[{ key: "avgSleepHours", name: "Sleep" }]} unit="hr" decimals={1} ariaLabel="Average hours of sleep by month" />
        </div>
        {hasBP && (
          <div>
            <h3 className="text-sm font-medium">
              Blood pressure{" "}
              <span className="font-normal text-muted">
                {first.avgSystolic}/{first.avgDiastolic} → {last.avgSystolic}/{last.avgDiastolic} mmHg
              </span>
            </h3>
            <TrendChart
              {...common}
              series={[
                { key: "avgSystolic", name: "Systolic (top)" },
                { key: "avgDiastolic", name: "Diastolic (bottom)" },
              ]}
              unit="mmHg"
              height={230}
              ariaLabel="Average systolic and diastolic blood pressure by month"
            />
          </div>
        )}
        {hasGlucose && (
          <div>
            <h3 className="text-sm font-medium">Fasting glucose</h3>
            <TrendChart {...common} series={[{ key: "avgBloodGlucose", name: "Fasting glucose" }]} unit="mg/dL" ariaLabel="Average fasting blood glucose by month" />
          </div>
        )}
      </div>
    </Card>
  );
}

function DayZoom({ memberId }: { memberId: string }) {
  const examples = EXAMPLE_DAYS[memberId] ?? [];
  const [date, setDate] = useState(examples[0]?.date ?? LAST_DAY);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= FIRST_DAY && date <= LAST_DAY;
  const { data, error, loading, retry } = useJson<VitalsResponse>(valid ? `/api/vitals/${memberId}?date=${date}` : null);

  return (
    <Card title="Zoom into a day" subtitle="Hour by hour, rolled up from minute-by-minute readings" action={<SourceBadge source={data?.source} queryMs={data?.queryMs} />}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-secondary">Date</span>
          <input
            type="date"
            min={FIRST_DAY}
            max={LAST_DAY}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-line bg-surface px-2 py-1.5"
          />
        </label>
        {examples.map((ex) => (
          <button
            key={ex.date}
            onClick={() => setDate(ex.date)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              ex.date === date ? "border-brand bg-brand-soft text-brand" : "border-line text-secondary hover:bg-surface-muted"
            }`}
          >
            {ex.why}
          </button>
        ))}
      </div>

      {!valid ? (
        <p className="text-sm text-warn">Pick a date between Nov 1, 2025 and Oct 31, 2026.</p>
      ) : error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : !data ? (
        <Skeleton className="h-52 w-full" />
      ) : (
        <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <DayCharts hours={data.hours} />
        </div>
      )}
    </Card>
  );
}

export default function FamilyMemberPage() {
  const { memberId } = useParams<{ memberId: string }>();
  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard" className="text-sm font-medium text-brand">
        ← Family dashboard
      </Link>
      <ProfileHeader memberId={memberId} />
      <YearTrends memberId={memberId} />
      <DayZoom memberId={memberId} />
      <Disclaimer />
    </div>
  );
}
