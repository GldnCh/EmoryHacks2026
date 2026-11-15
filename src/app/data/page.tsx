"use client";
// "Powered by Tiger Data" (TD) for the MLH Tiger Data prize.
// Reads /api/tiger/stats (storage, compression, benchmark) and /api/tiger/cohort (Jordan vs Rosa blood pressure).
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/Card";
import { AXIS_TICK, GRID_STROKE, TOOLTIP_STYLE } from "@/components/chartTheme";
import Disclaimer from "@/components/Disclaimer";
import { ArchiveIcon, DatabaseIcon, LayersIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote, SourceBadge } from "@/components/Status";
import TrendChart from "@/components/TrendChart";
import { monthLabel, monthLong } from "@/components/types";
import { useJson } from "@/components/useJson";

interface StatsResponse {
  source: string;
  members: number;
  dailyRows: number;
  minuteRows: number;
  chunks: number;
  compressedChunks: number;
  minuteTableMB: number;
  compression: { beforeMB: number; afterMB: number; savedPercent: number };
  continuousAggregates: string[];
  benchmark: { question: string; rawMinuteDataMs: number; continuousAggregateMs: number; speedup: number };
}

interface CohortResponse {
  condition: string;
  source: string;
  queryMs?: number;
  members: { id: string; name: string; months: { month: string; avgSystolic?: number }[] }[];
}

const AGGREGATE_INFO: Record<string, string> = {
  health_monthly: "Monthly averages per person (powers the 12-month trends)",
  vitals_daily: "Daily heart rate and steps from the minute readings",
  vitals_hourly: "Hour-by-hour vitals (powers “Zoom into a day”)",
};

const EXPLAINERS = [
  {
    term: "Hypertable",
    text: "One big table that Tiger Data quietly splits into time-based chunks, so new readings stay fast to write and old ones stay fast to find.",
    Icon: DatabaseIcon,
    tint: "from-[#6aa8f0] to-[#2a6fd0]",
  },
  {
    term: "Continuous aggregate",
    text: "A summary (like each month's average) that the database keeps up to date by itself, so charts read a few rows instead of millions.",
    Icon: LayersIcon,
    tint: "from-[#FFC46B] to-[#F2683A]",
  },
  {
    term: "Compression",
    text: "Older chunks are packed column by column, which shrinks the history a lot and can still be queried like normal.",
    Icon: ArchiveIcon,
    tint: "from-[#f6a35a] to-[#d9622b]",
  },
];

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <p className="font-[family-name:var(--font-rounded)] text-[28px] font-semibold leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-footnote text-secondary">{label}</p>
    </div>
  );
}

function compact(n: number): string {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n.toLocaleString("en-US");
}

function Stats() {
  const { data, error, loading, retry } = useJson<StatsResponse>("/api/tiger/stats");
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={3} />;

  const bench = [
    { name: "Raw minute data", ms: data.benchmark.rawMinuteDataMs },
    { name: "Continuous aggregate", ms: data.benchmark.continuousAggregateMs },
  ];

  return (
    <>
      <Card title="What's stored" action={<SourceBadge source={data.source} />}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Fact value={compact(data.minuteRows)} label="minute-by-minute readings" />
          <Fact value={data.dailyRows.toLocaleString("en-US")} label={`daily rows for ${data.members} people`} />
          <Fact value={String(data.chunks)} label={`chunks (${data.compressedChunks} compressed)`} />
          <Fact value={`${data.compression.savedPercent}%`} label="space saved by compression" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Compression" subtitle="Minute readings, before and after">
          <div className="flex flex-col gap-4">
            {[
              { label: "Before", mb: data.compression.beforeMB },
              { label: "After", mb: data.compression.afterMB },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-subhead">
                  <span className="text-secondary">{row.label}</span>
                  <span className="font-semibold">{row.mb} MB</span>
                </div>
                <div className="h-2.5 rounded-full bg-fill">
                  <div
                    className="h-2.5 rounded-full bg-[var(--series-1)] transition-[width] duration-700 ease-[var(--ease-ios)]"
                    style={{ width: `${Math.max(1.5, (row.mb / data.compression.beforeMB) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-subhead text-secondary">
              {data.compression.savedPercent}% smaller: {data.compression.beforeMB} MB → {data.compression.afterMB} MB.
            </p>
          </div>
        </Card>

        <Card title="Continuous aggregates" subtitle="Summaries Tiger Data keeps fresh for us">
          <ul className="flex flex-col gap-2">
            {data.continuousAggregates.map((name) => (
              <li key={name} className="rounded-2xl bg-surface-muted px-4 py-3">
                <code className="font-mono text-footnote font-semibold">{name}</code>
                <p className="mt-0.5 text-footnote text-secondary">{AGGREGATE_INFO[name] ?? "Pre-computed summary"}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Speed test" subtitle={`${data.benchmark.question}: ${data.benchmark.speedup}× faster from the continuous aggregate`}>
        <div role="img" aria-label={`Query time: raw minute data ${bench[0].ms} ms, continuous aggregate ${bench[1].ms} ms`} className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bench} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" ms" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 13, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--fill)" }} formatter={(v) => [`${v} ms`, "Query time"]} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="ms" fill="var(--series-1)" radius={[0, 6, 6, 0]} maxBarSize={26} isAnimationActive={false}>
                <LabelList dataKey="ms" position="right" formatter={(v) => `${v} ms`} style={{ fontSize: 13, fontWeight: 600, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-footnote text-muted">Measured live on each page load, so the numbers change a little every time.</p>
      </Card>
    </>
  );
}

function Cohort() {
  const { data, error, loading, retry } = useJson<CohortResponse>("/api/tiger/cohort?condition=hypertension");
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={1} />;

  const months = data.members[0]?.months.map((m) => m.month) ?? [];
  const rows = months.map((month) => {
    const row: Record<string, unknown> = { month };
    for (const mem of data.members) row[mem.id] = mem.months.find((m) => m.month === month)?.avgSystolic ?? null;
    return row;
  });

  return (
    <Card
      title="Family members with high blood pressure"
      subtitle="Monthly average systolic (top number), from a single cohort query"
      action={<SourceBadge source={data.source} queryMs={data.queryMs} />}
    >
      <TrendChart
        data={rows}
        xKey="month"
        formatX={monthLabel}
        formatTooltipX={monthLong}
        series={data.members.map((m) => ({ key: m.id, name: m.name.split(" ")[0] }))}
        unit="mmHg"
        height={260}
        ariaLabel="Monthly systolic blood pressure for family members with hypertension"
      />
    </Card>
  );
}

export default function DataPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        eyebrow="MLH · Best use of Tiger Data"
        title="Powered by Tiger Data"
        subtitle="A year of Apple Watch-style readings for a family of four lives in Tiger Data (TimescaleDB on PostgreSQL)."
      />

      <section aria-label="How it works" className="card px-5 py-1 sm:px-6">
        <dl>
          {EXPLAINERS.map(({ term, text, Icon, tint }) => (
            <div key={term} className="flex gap-4 py-4 [&+&]:border-t [&+&]:border-line">
              <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-b text-white shadow-sm ${tint}`}>
                <Icon size={20} />
              </span>
              <div>
                <dt className="text-headline">{term}</dt>
                <dd className="mt-0.5 text-subhead text-secondary">{text}</dd>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <Stats />
      <Cohort />
      <Disclaimer />
    </div>
  );
}
