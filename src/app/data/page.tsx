"use client";
// "Powered by Tiger Data" (TD) for the MLH Tiger Data prize.
// Reads /api/tiger/stats (storage, compression, benchmark) and /api/tiger/cohort (Jordan vs Rosa blood pressure).
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "@/components/Card";
import Disclaimer from "@/components/Disclaimer";
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
  },
  {
    term: "Continuous aggregate",
    text: "A summary (like each month's average) that the database keeps up to date by itself, so charts read a few rows instead of millions.",
  },
  {
    term: "Compression",
    text: "Older chunks are packed column by column, which shrinks the history a lot and can still be queried like normal.",
  },
];

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-secondary">{label}</p>
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
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Fact value={compact(data.minuteRows)} label="minute-by-minute readings" />
          <Fact value={data.dailyRows.toLocaleString("en-US")} label={`daily rows for ${data.members} people`} />
          <Fact value={String(data.chunks)} label={`chunks (${data.compressedChunks} compressed)`} />
          <Fact value={`${data.compression.savedPercent}%`} label="space saved by compression" />
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Compression" subtitle="Minute readings, before and after">
          <div className="flex flex-col gap-3 text-sm">
            {[
              { label: "Before", mb: data.compression.beforeMB },
              { label: "After", mb: data.compression.afterMB },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between">
                  <span className="text-secondary">{row.label}</span>
                  <span className="font-semibold">{row.mb} MB</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted">
                  <div
                    className="h-2 rounded-full bg-[var(--series-1)]"
                    style={{ width: `${Math.max(1, (row.mb / data.compression.beforeMB) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-secondary">
              {data.compression.savedPercent}% smaller: {data.compression.beforeMB} MB → {data.compression.afterMB} MB.
            </p>
          </div>
        </Card>

        <Card title="Continuous aggregates" subtitle="Summaries Tiger Data keeps fresh for us">
          <ul className="flex flex-col gap-2 text-sm">
            {data.continuousAggregates.map((name) => (
              <li key={name} className="rounded-xl bg-surface-muted p-3">
                <code className="font-mono text-xs font-semibold">{name}</code>
                <p className="text-xs text-secondary">{AGGREGATE_INFO[name] ?? "Pre-computed summary"}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title="Speed test"
        subtitle={`${data.benchmark.question}: ${data.benchmark.speedup}× faster from the continuous aggregate`}
      >
        <div role="img" aria-label={`Query time: raw minute data ${bench[0].ms} ms, continuous aggregate ${bench[1].ms} ms`} className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bench} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} unit=" ms" />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-muted)" }}
                formatter={(v) => [`${v} ms`, "Query time"]}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
              />
              <Bar dataKey="ms" fill="var(--series-1)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                <LabelList dataKey="ms" position="right" formatter={(v) => `${v} ms`} style={{ fontSize: 12, fill: "var(--foreground)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-muted">Measured live on each page load, so the numbers change a little every time.</p>
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
        height={240}
        ariaLabel="Monthly systolic blood pressure for family members with hypertension"
      />
    </Card>
  );
}

export default function DataPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-semibold text-brand">MLH · Best use of Tiger Data</p>
        <h1 className="text-2xl font-bold tracking-tight">Powered by Tiger Data</h1>
        <p className="text-sm text-secondary">
          A year of Apple Watch-style readings for a family of four lives in Tiger Data (TimescaleDB on PostgreSQL).
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        {EXPLAINERS.map((e) => (
          <div key={e.term} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <dt className="font-semibold">{e.term}</dt>
            <dd className="mt-1 text-sm text-secondary">{e.text}</dd>
          </div>
        ))}
      </dl>

      <Stats />
      <Cohort />
      <Disclaimer />
    </div>
  );
}
