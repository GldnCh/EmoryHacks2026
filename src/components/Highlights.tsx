"use client";
// "Highlights" feed for one person (TD), in the style of the iOS 15 Health app's Summary screen:
// white cards on the grouped gray, each headed by a colored icon + category name and a chevron, then one plain
// sentence about what changed, then a small visual (a before/after comparison or a 12-month bar chart).
// Everything is computed from the person's monthly averages; nothing is a made-up score.
// Status always pairs color with an arrow and a word. Not medical advice.
import Link from "next/link";
import { ChevronRight } from "@/components/Icons";
import { METRICS, type MetricKey } from "@/components/metrics";
import { STEADY_FRACTION, fmt } from "@/components/StatTile";
import { monthLong, type TrendRow } from "@/components/types";

interface MetricDef {
  get: (t: TrendRow) => number | null | undefined;
  betterWhen: "up" | "down";
  unit: string;
  decimals: number;
  /** Lower-case name for a sentence, e.g. "resting heart rate". */
  noun: string;
  /** How a value reads in a sentence, e.g. "8,240 steps a day". */
  phrase: (v: string) => string;
  display?: (t: TrendRow) => string;
}

const DEFS: Record<MetricKey, MetricDef> = {
  sleep: { get: (t) => t.avgSleepHours, betterWhen: "up", unit: "hr", decimals: 1, noun: "sleep", phrase: (v) => `${v} hours of sleep a night` },
  steps: { get: (t) => t.avgSteps, betterWhen: "up", unit: "steps", decimals: 0, noun: "daily steps", phrase: (v) => `${v} steps a day` },
  heart: {
    get: (t) => t.avgRestingHeartRate,
    betterWhen: "down",
    unit: "bpm",
    decimals: 0,
    noun: "resting heart rate",
    phrase: (v) => `a resting heart rate of ${v} bpm`,
  },
  bp: {
    get: (t) => t.avgSystolic,
    betterWhen: "down",
    unit: "mmHg",
    decimals: 0,
    noun: "blood pressure (top number)",
    phrase: (v) => `a blood pressure top number of ${v} mmHg`,
    display: (t) => `${t.avgSystolic}/${t.avgDiastolic}`,
  },
  glucose: {
    get: (t) => t.avgBloodGlucose,
    betterWhen: "down",
    unit: "mg/dL",
    decimals: 0,
    noun: "fasting glucose",
    phrase: (v) => `a fasting glucose of ${v} mg/dL`,
  },
};

const ORDER: MetricKey[] = ["bp", "glucose", "heart", "sleep", "steps"];

type Tone = "good" | "warn" | "flat";

interface Change {
  key: MetricKey;
  latest: number;
  previous: number;
  diff: number;
  /** |diff| as a share of last month */
  size: number;
  tone: Tone;
  word: string;
}

function changeFor(key: MetricKey, trends: TrendRow[]): Change | null {
  const d = DEFS[key];
  const latest = d.get(trends.at(-1)!);
  const previous = trends.length > 1 ? d.get(trends.at(-2)!) : null;
  if (latest == null || previous == null) return null;
  const diff = Number((latest - previous).toFixed(d.decimals));
  const size = previous !== 0 ? Math.abs(diff / previous) : 0;
  if (diff === 0 || size < STEADY_FRACTION) return { key, latest, previous, diff, size, tone: "flat", word: "Steady" };
  const improving = d.betterWhen === "up" ? diff > 0 : diff < 0;
  return { key, latest, previous, diff, size, tone: improving ? "good" : "warn", word: improving ? "Improving" : "Worsening" };
}

/** Changes that moved more than normal month-to-month noise, biggest first. Used by the dashboard too. */
export function notableChanges(trends: TrendRow[]): Change[] {
  return ORDER.map((k) => changeFor(k, trends))
    .filter((c): c is Change => c !== null && c.tone !== "flat")
    .sort((a, b) => b.size - a.size);
}

const TONE_TEXT: Record<Tone, string> = { good: "text-good", warn: "text-warn", flat: "text-secondary" };
const ARROW = (diff: number) => (diff > 0 ? "↑" : diff < 0 ? "↓" : "→");

/** Category color darkened enough for small text on white (at least 5:1 for every metric color). */
export const labelColor = (accent: string) => `color-mix(in srgb, ${accent} 78%, black)`;

const shortMonth = (m: string) => {
  const [name, year] = monthLong(m).split(" ");
  return `${name.slice(0, 3)} ${year}`;
};

/** Card header: colored icon + category name on the left, chevron on the right. The whole row opens the trend. */
function CardHead({ k, memberId }: { k: MetricKey; memberId: string }) {
  const meta = METRICS[k];
  return (
    <Link
      href={`/family/${memberId}?tab=${k}#trends`}
      scroll={false}
      onClick={() => document.getElementById("trends")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="group -mx-2 -mt-1 flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[15px] font-semibold hover:bg-fill/60"
      style={{ color: labelColor(meta.accent) }}
    >
      <span style={{ color: meta.accent }}>{meta.icon}</span>
      <span className="flex-1">{meta.label}</span>
      <span className="sr-only">: open 12-month trend</span>
      <ChevronRight size={17} className="text-[#c4c4c7] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Where a value sits between the person's lowest and highest month: a thin track with a dot. */
function RangeDot({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const pos = max > min ? (value - min) / (max - min) : 0.5;
  return (
    <span aria-hidden className="relative mt-2 block h-1 w-full max-w-[120px] rounded-full bg-[var(--fill-strong)]">
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
        style={{ left: `${pos * 100}%`, background: color }}
      />
    </span>
  );
}

function ComparisonCard({ c, trends, memberId, possessive }: { c: Change; trends: TrendRow[]; memberId: string; possessive: string }) {
  const d = DEFS[c.key];
  const meta = METRICS[c.key];
  const last = trends.at(-1)!;
  const prev = trends.at(-2)!;
  const [month, prevMonth] = [monthLong(last.month).split(" ")[0], monthLong(prev.month).split(" ")[0]];
  const values = trends.map(d.get).filter((v): v is number => v != null);
  const [min, max] = [Math.min(...values), Math.max(...values)];
  const sentence =
    c.tone === "flat"
      ? `${possessive} average ${d.noun} in ${month} stayed about the same as in ${prevMonth}.`
      : `${possessive} average ${d.noun} in ${month} was ${c.diff > 0 ? "higher" : "lower"} than in ${prevMonth}.`;
  const side = (t: TrendRow, v: number, align: "start" | "end") => (
    <div className={`flex min-w-0 flex-1 flex-col ${align === "end" ? "items-end text-right" : ""}`}>
      <span className="text-footnote text-secondary">{shortMonth(t.month)}</span>
      <span className="mt-0.5 whitespace-nowrap font-[family-name:var(--font-rounded)] text-[22px] font-semibold leading-tight tracking-tight">
        {d.display ? d.display(t) : fmt(v, d.decimals)}
        <span className="ml-1 font-sans text-footnote font-medium text-secondary">{d.unit}</span>
      </span>
      <RangeDot value={v} min={min} max={max} color={meta.accent} />
    </div>
  );

  return (
    <article className="card p-4 sm:p-5">
      <CardHead k={c.key} memberId={memberId} />
      <p className="mt-1.5 text-[17px] font-semibold leading-snug">{sentence}</p>
      <div className="mt-3 border-t border-[var(--separator)] pt-3">
        <div className="flex items-center gap-3">
          {side(prev, c.previous, "start")}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span
              aria-hidden
              className="grid h-11 w-11 place-items-center rounded-full text-[22px] font-bold leading-none text-white"
              style={{ background: meta.accent }}
            >
              {ARROW(c.diff)}
            </span>
            <span className={`text-caption font-semibold ${TONE_TEXT[c.tone]}`}>{c.word}</span>
          </div>
          {side(last, c.latest, "end")}
        </div>
        <p className="mt-2.5 text-caption text-muted">Each dot shows where that month sits between the lowest and highest month this year.</p>
      </div>
    </article>
  );
}

/** "Active Energy" style: one average as a big number, and the months as thin bars with an average line. */
function AverageBarsCard({ k, trends, memberId, who }: { k: MetricKey; trends: TrendRow[]; memberId: string; who: string }) {
  const d = DEFS[k];
  const meta = METRICS[k];
  const points = trends.map((t) => ({ month: t.month, v: d.get(t) })).filter((p): p is { month: string; v: number } => p.v != null);
  if (points.length < 2) return null;
  const avg = points.reduce((s, p) => s + p.v, 0) / points.length;
  const top = Math.max(...points.map((p) => p.v)) * 1.08;
  const avgText = fmt(avg, d.decimals);
  const best = points.reduce((a, b) => ((d.betterWhen === "up" ? b.v > a.v : b.v < a.v) ? b : a));

  return (
    <article className="card p-4 sm:p-5">
      <CardHead k={k} memberId={memberId} />
      <p className="mt-1.5 text-[17px] font-semibold leading-snug">
        {who} averaged {d.phrase(avgText)} over the last {points.length} months.
      </p>
      <div className="mt-3 flex items-end gap-4 border-t border-[var(--separator)] pt-3">
        <div className="shrink-0 pb-6">
          <p className="text-footnote font-semibold text-secondary">Average {meta.short}</p>
          <p className="font-[family-name:var(--font-rounded)] text-[30px] font-semibold leading-tight tracking-tight">
            {avgText}
            <span className="ml-1 font-sans text-footnote font-medium text-secondary">{d.unit === "steps" ? "steps" : d.unit}</span>
          </p>
          <p className="mt-1 text-caption text-muted">Best: {shortMonth(best.month)}</p>
        </div>
        <figure
          role="img"
          aria-label={`${meta.label} by month: average ${avgText}; lowest ${fmt(Math.min(...points.map((p) => p.v)), d.decimals)}, highest ${fmt(
            Math.max(...points.map((p) => p.v)),
            d.decimals,
          )}.`}
          className="relative min-w-0 flex-1"
        >
          <div className="relative flex h-[120px] items-end gap-[3px] sm:gap-1.5">
            {/* average line: 2px, in the metric color, drawn across the bars */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full"
              style={{ bottom: `${(avg / top) * 100}%`, background: meta.accent }}
            />
            {points.map((p, i) => (
              <div key={p.month} className="group relative flex h-full flex-1 items-end justify-center">
                <span
                  className="block w-full max-w-[14px] rounded-t-[4px] transition-colors"
                  style={{
                    height: `${(p.v / top) * 100}%`,
                    background: i === points.length - 1 ? `color-mix(in srgb, ${meta.accent} 55%, #c7c7cc)` : "#d1d1d6",
                  }}
                />
                <span className="pointer-events-none absolute bottom-full z-20 mb-1 hidden whitespace-nowrap rounded-lg bg-foreground px-2 py-1 text-caption font-semibold text-white group-hover:block">
                  {shortMonth(p.month)}: {fmt(p.v, d.decimals)}
                </span>
              </div>
            ))}
          </div>
          <div aria-hidden className="mt-1.5 flex gap-[3px] sm:gap-1.5">
            {points.map((p) => (
              <span key={p.month} className="flex-1 text-center text-[10px] font-medium text-muted">
                {monthLong(p.month)[0]}
              </span>
            ))}
          </div>
        </figure>
      </div>
    </article>
  );
}

function SentenceCard({ c, memberId, who }: { c: Change; memberId: string; who: string }) {
  const d = DEFS[c.key];
  const amount = `${fmt(Math.abs(c.diff), d.decimals)} ${d.unit}`;
  return (
    <article className="card p-4 sm:p-5">
      <CardHead k={c.key} memberId={memberId} />
      <p className="mt-1.5 text-[17px] font-semibold leading-snug">
        Over the last month, {who === "You" ? "your" : `${who}'s`} {d.noun} went {c.diff > 0 ? "up" : "down"} by {amount}.
      </p>
      <p className={`mt-1 text-footnote font-semibold ${TONE_TEXT[c.tone]}`}>
        {ARROW(c.diff)} {c.word}
      </p>
    </article>
  );
}

export default function Highlights({ trends, firstName, self, memberId }: { trends: TrendRow[]; firstName: string; self: boolean; memberId: string }) {
  if (trends.length < 2) return null;
  const who = self ? "You" : firstName;
  const possessive = self ? "Your" : `${firstName}'s`;
  const moved = notableChanges(trends);
  const lead = moved[0] ?? changeFor("steps", trends);
  const second = moved.find((c) => c.key !== lead?.key && c.key !== "steps");
  const barsKey: MetricKey = lead?.key === "steps" ? "sleep" : "steps";

  return (
    <section aria-labelledby="highlights-title" className="flex flex-col gap-3">
      <h2 id="highlights-title" className="text-title2">
        Highlights
      </h2>
      {lead && <ComparisonCard c={lead} trends={trends} memberId={memberId} possessive={possessive} />}
      <AverageBarsCard k={barsKey} trends={trends} memberId={memberId} who={who} />
      {second && <SentenceCard c={second} memberId={memberId} who={who} />}
    </section>
  );
}
