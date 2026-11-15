"use client";
// "What matters most" cards on a person's profile (Cam). Each card shows one key thing (a value, a tiny 12-month
// sparkline and an arrow + word) and opens in place for the details. Only one card is open at a time, so the page
// never shows everything at once. Cards are ordered by `weight` (highest first); the caller decides the weights.
// Motion (MIT): cards glide to their new places when one opens (layout animation), details fold open, numbers roll in.
import { useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "@/components/Icons";
import RollingNumber from "@/components/RollingNumber";

export type Tone = "good" | "warn" | "flat";

export interface TileSpec {
  key: string;
  title: string;
  icon: ReactNode;
  accent: string; // icon color (decoration only)
  weight: number;
  /** Short reason this card is near the top, e.g. "Linked to high blood pressure". */
  why?: string;
  value?: ReactNode;
  unit?: string;
  trend?: { arrow: string; word: string; tone: Tone };
  spark?: number[];
  /** For cards without a single number (medicines, check-ins...). */
  summary?: ReactNode;
  detail: ReactNode;
}

const TONE: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  flat: "bg-fill text-secondary",
};

/** A tiny line of the last 12 values. Decorative: the number and the word carry the meaning. */
export function Sparkline({ values, color, width = 120, height = 34 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts.at(-1)!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="block">
      <path d={`${d} L${last[0]} ${height} L2 ${height} Z`} fill={color} opacity=".12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}

const GLASS =
  "rounded-[22px] border border-white/60 bg-white/65 shadow-[0_10px_28px_rgba(170,70,20,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl";

const SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;

function Tile({ t, open, onToggle, glass }: { t: TileSpec; open: boolean; onToggle: () => void; glass?: boolean }) {
  const panelId = `tile-${t.key}`;
  const reduce = useReducedMotion();
  return (
    <motion.section
      layout={!reduce}
      transition={SPRING}
      style={{ borderRadius: 22 }}
      className={`${glass ? GLASS : "card"} overflow-hidden transition-shadow ${open ? "col-span-full shadow-raised" : ""}`}
    >
      <motion.button
        layout={reduce ? false : "position"}
        transition={SPRING}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="pressable flex w-full flex-col gap-1.5 p-3.5 text-left hover:bg-white/40 sm:p-4"
      >
        <span className="flex w-full items-center gap-2">
          <span style={{ color: t.accent }} className="shrink-0">
            {t.icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-footnote font-semibold" style={{ color: t.accent }}>
            {t.title}
          </span>
          <ChevronRight size={16} className={`shrink-0 text-muted transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
        </span>
        {t.value !== undefined ? (
          <span className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
            <span className="font-[family-name:var(--font-rounded)] text-[24px] font-semibold leading-none tracking-tight text-foreground">
              {typeof t.value === "string" ? <RollingNumber value={t.value} /> : t.value}
              {t.unit && <span className="ml-1 font-sans text-footnote font-medium text-secondary">{t.unit}</span>}
            </span>
            {t.spark && <Sparkline values={t.spark} color={t.accent} width={open ? 160 : 92} />}
          </span>
        ) : (
          t.summary && <span className="text-subhead text-foreground">{t.summary}</span>
        )}
        <span className="flex flex-wrap items-center gap-2">
          {t.trend && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-semibold ${TONE[t.trend.tone]}`}>
              {t.trend.arrow} {t.trend.word}
            </span>
          )}
          {t.why && <span className="text-caption text-muted">{t.why}</span>}
        </span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detail"
            id={panelId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={SPRING}
            className="overflow-hidden"
          >
            <div className="border-t border-line p-3.5 sm:p-4">{t.detail}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export default function ProfileTiles({ title, subtitle, tiles, glass = false }: { title: string; subtitle: string; tiles: TileSpec[]; glass?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = [...tiles].sort((a, b) => b.weight - a.weight);
  return (
    <section aria-labelledby="matters-heading">
      <div className="mb-2.5 px-1">
        <h2 id="matters-heading" className="text-title3">
          {title}
        </h2>
        <p className="mt-0.5 text-footnote text-secondary">{subtitle}</p>
      </div>
      <LayoutGroup>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {sorted.map((t) => (
            <Tile key={t.key} t={t} glass={glass} open={open === t.key} onToggle={() => setOpen((o) => (o === t.key ? null : t.key))} />
          ))}
        </div>
      </LayoutGroup>
    </section>
  );
}
