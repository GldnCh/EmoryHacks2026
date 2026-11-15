"use client";
// Health-app style "at a glance" pieces for one person (TD), built from their 12-month trends.
// - GlanceChips: a row of small pills (Sleep, Steps, Heart, ...) with the latest month and a one-word trend.
// - HighlightCard: the month's biggest change as a big headline, with a segmented ring that shows how the
//   latest month ranks against the 11 before it. Everything is computed from the data; nothing is a made-up score.
// Status always pairs color with an arrow and a word. Not medical advice.
import Link from "next/link";
import { METRICS, type MetricKey } from "@/components/metrics";
import { STEADY_FRACTION, fmt } from "@/components/StatTile";
import { monthLong, type TrendRow } from "@/components/types";

interface MetricDef {
  get: (t: TrendRow) => number | null | undefined;
  betterWhen: "up" | "down";
  unit: string;
  decimals: number;
  /** How the value reads in a sentence, e.g. "8,240 steps a day". */
  phrase: (v: string) => string;
  display?: (t: TrendRow) => string;
}

const DEFS: Record<MetricKey, MetricDef> = {
  sleep: {
    get: (t) => t.avgSleepHours,
    betterWhen: "up",
    unit: "hr",
    decimals: 1,
    phrase: (v) => `${v} hours of sleep a night`,
  },
  steps: {
    get: (t) => t.avgSteps,
    betterWhen: "up",
    unit: "steps",
    decimals: 0,
    phrase: (v) => `${v} steps a day`,
  },
  heart: {
    get: (t) => t.avgRestingHeartRate,
    betterWhen: "down",
    unit: "bpm",
    decimals: 0,
    phrase: (v) => `a resting heart rate of ${v} bpm`,
  },
  bp: {
    get: (t) => t.avgSystolic,
    betterWhen: "down",
    unit: "mmHg",
    decimals: 0,
    phrase: (v) => `a blood pressure top number of ${v} mmHg`,
    display: (t) => `${t.avgSystolic}/${t.avgDiastolic}`,
  },
  glucose: {
    get: (t) => t.avgBloodGlucose,
    betterWhen: "down",
    unit: "mg/dL",
    decimals: 0,
    phrase: (v) => `a fasting glucose of ${v} mg/dL`,
  },
};

const ORDER: MetricKey[] = ["sleep", "steps", "heart", "bp", "glucose"];

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
  return {
    key,
    latest,
    previous,
    diff,
    size,
    tone: improving ? "good" : "warn",
    word: improving ? "Improving" : "Worsening",
  };
}

const TONE_TEXT: Record<Tone, string> = {
  good: "text-good",
  warn: "text-warn",
  flat: "text-secondary",
};
const ARROW = (diff: number) => (diff > 0 ? "↑" : diff < 0 ? "↓" : "→");

export function GlanceChips({ trends, memberId }: { trends: TrendRow[]; memberId: string }) {
  const last = trends.at(-1);
  if (!last) return null;
  const keys = ORDER.filter((k) => DEFS[k].get(last) != null);

  return (
    <nav aria-label={`At a glance, ${monthLong(last.month)}`} className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 pb-1">
        {keys.map((k) => {
          const d = DEFS[k];
          const c = changeFor(k, trends);
          const value = d.display ? d.display(last) : fmt(d.get(last), d.decimals);
          return (
            <li key={k}>
              <Link
                href={`/family/${memberId}?tab=${k}#trends`}
                scroll={false}
                onClick={() => document.getElementById("trends")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="pressable liquid-glass flex min-h-12 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
                  style={{
                    background: `linear-gradient(180deg, color-mix(in srgb, ${METRICS[k].accent} 78%, white), ${METRICS[k].accent})`,
                  }}
                >
                  {METRICS[k].icon}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-caption font-semibold text-secondary">{METRICS[k].short}</span>
                  <span className="whitespace-nowrap text-footnote font-semibold">
                    {value} <span className="font-normal text-secondary">{d.unit === "steps" ? "steps" : d.unit}</span>
                    {c && (
                      <span className={`ml-1.5 ${TONE_TEXT[c.tone]}`}>
                        {ARROW(c.diff)} {c.word}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Segmented ring: `filled` of `total` segments lit, with small gaps between segments. */
function SegmentRing({
  filled,
  total,
  color,
  children,
  label,
}: {
  filled: number;
  total: number;
  color: string;
  children: React.ReactNode;
  label: string;
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const gap = 4;
  const seg = c / total - gap;
  return (
    <div role="img" aria-label={label} className="relative grid h-[124px] w-[124px] shrink-0 place-items-center">
      <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full -rotate-90">
        {Array.from({ length: total }, (_, i) => (
          <circle
            key={i}
            cx="56"
            cy="56"
            r={r}
            fill="none"
            strokeWidth="11"
            strokeLinecap="round"
            stroke={i < filled ? color : "var(--fill-strong)"}
            strokeDasharray={`${Math.max(seg - 6, 1)} ${c}`}
            strokeDashoffset={-(i * (seg + gap) + 3)}
          />
        ))}
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

export function HighlightCard({ trends, firstName, self }: { trends: TrendRow[]; firstName: string; self: boolean }) {
  const last = trends.at(-1);
  const prev = trends.at(-2);
  if (!last || !prev) return null;

  const changes = ORDER.map((k) => changeFor(k, trends)).filter((c): c is Change => c !== null);
  const moved = changes.filter((c) => c.tone !== "flat").sort((a, b) => b.size - a.size);
  const pick = moved[0] ?? changes.find((c) => c.key === "steps") ?? changes[0];
  if (!pick) return null;

  const d = DEFS[pick.key];
  const meta = METRICS[pick.key];
  const who = self ? "You" : firstName;
  const month = monthLong(last.month).split(" ")[0];
  const prevMonth = monthLong(prev.month).split(" ")[0];

  // Rank the latest month against the other months, in the healthy direction.
  const others = trends
    .slice(0, -1)
    .map(d.get)
    .filter((v): v is number => v != null);
  const better = others.filter((v) => (d.betterWhen === "up" ? pick.latest > v : pick.latest < v)).length;

  const headline = pick.tone === "flat" ? "A steady month" : `${meta.label} ${pick.diff > 0 ? "went up" : "went down"} in ${month}`;
  const amount = `${fmt(Math.abs(pick.diff), d.decimals)} ${d.unit === "steps" ? "steps" : d.unit}`;
  const sentence =
    pick.tone === "flat"
      ? `${who} stayed close to ${prevMonth} on every measure, averaging ${d.phrase(fmt(pick.latest, d.decimals))} in ${month}.`
      : `${who} averaged ${d.phrase(fmt(pick.latest, d.decimals))} in ${month}, ${ARROW(pick.diff)} ${amount} from ${prevMonth}.`;

  return (
    <section
      aria-labelledby="highlight-title"
      className="card relative overflow-hidden p-5 sm:p-6"
      style={{
        background: `linear-gradient(160deg, color-mix(in srgb, ${meta.accent} 13%, white) 0%, var(--surface) 62%)`,
      }}
    >
      <p className="flex items-center gap-1.5 text-footnote font-semibold text-secondary">
        <span style={{ color: meta.accent }}>{meta.icon}</span>
        Highlight · {monthLong(last.month)}
      </p>
      <div className="mt-3 flex flex-col-reverse gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="highlight-title" className="text-title2 sm:text-[28px] sm:leading-tight">
            {headline}
          </h2>
          <p className="mt-1.5 max-w-xl text-subhead text-secondary">{sentence}</p>
          <p
            className={`mt-3 inline-flex rounded-[10px] px-2.5 py-1 text-footnote font-semibold ${
              pick.tone === "good" ? "bg-good-soft text-good" : pick.tone === "warn" ? "bg-warn-soft text-warn" : "bg-fill text-secondary"
            }`}
          >
            {ARROW(pick.diff)} {pick.word}
          </p>
        </div>
        {others.length > 0 && (
          <div className="flex items-center gap-4 sm:flex-col sm:gap-2">
            <SegmentRing
              filled={better}
              total={others.length}
              color={meta.accent}
              label={`${month} was better than ${better} of the previous ${others.length} months`}
            >
              <span className="block font-[family-name:var(--font-rounded)] text-[34px] font-semibold leading-none tracking-tight">
                {d.display ? d.display(last) : fmt(pick.latest, d.decimals)}
              </span>
              <span className="mt-1 block text-caption font-medium text-secondary">{d.unit}</span>
            </SegmentRing>
            <p className="max-w-[150px] text-footnote text-secondary sm:text-center">
              Better than{" "}
              <span className="font-semibold text-foreground">
                {better} of {others.length}
              </span>{" "}
              earlier months
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
