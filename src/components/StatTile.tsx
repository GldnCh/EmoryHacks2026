// Health-app (iOS 15) style tile: metric name in its category color with a small icon, big rounded number with a
// gray unit, then the change vs last month as plain text.
// Green with "improving" when the change goes the healthy way, amber with "worsening" when it doesn't,
// gray "steady" when it moved less than STEADY_FRACTION (normal month-to-month noise).
// The arrow and word always go with the color, so meaning never depends on color alone.
import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: number | null | undefined;
  unit?: string;
  decimals?: number;
  /** Last month's value, for the change line. */
  previous?: number | null;
  /** Which direction is the healthy one for this measure. */
  betterWhen?: "up" | "down";
  /** Show the value as text instead of a number, e.g. "127/81". */
  display?: string;
  icon?: ReactNode;
  /** Icon color only; text always stays in the text colors. */
  accent?: string;
}

/** Changes smaller than this share of last month's value read as "steady", not better or worse. */
export const STEADY_FRACTION = 0.025;

export function fmt(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function StatTile({ label, value, unit, decimals = 0, previous, betterWhen = "up", display, icon, accent }: StatTileProps) {
  let change: { text: string; tone: "good" | "warn" | "flat" } | null = null;
  if (value != null && previous != null) {
    const diff = Number((value - previous).toFixed(decimals));
    const amount = `${fmt(Math.abs(diff), decimals)}${unit ? ` ${unit}` : ""}`;
    if (diff === 0) {
      change = { text: "→ no change", tone: "flat" };
    } else if (previous !== 0 && Math.abs(diff / previous) < STEADY_FRACTION) {
      change = { text: `${diff > 0 ? "↑" : "↓"} ${amount} · steady`, tone: "flat" };
    } else {
      const improving = betterWhen === "up" ? diff > 0 : diff < 0;
      change = {
        text: `${diff > 0 ? "↑" : "↓"} ${amount} · ${improving ? "improving" : "worsening"}`,
        tone: improving ? "good" : "warn",
      };
    }
  }
  const toneClass = change?.tone === "good" ? "text-good" : change?.tone === "warn" ? "text-warn" : "text-secondary";

  return (
    <div className="flex flex-col rounded-xl bg-surface-muted p-3.5">
      <p
        className="flex items-start gap-1.5 text-footnote font-semibold leading-snug text-secondary"
        style={accent ? { color: `color-mix(in srgb, ${accent} 74%, black)` } : undefined}
      >
        {icon && (
          <span style={{ color: accent }} className="mt-px shrink-0">
            {icon}
          </span>
        )}
        <span className="line-clamp-2">{label}</span>
      </p>
      <p className="mb-2 mt-2 font-[family-name:var(--font-rounded)] text-[28px] font-semibold leading-none tracking-tight">
        {display ?? fmt(value, decimals)}
        {unit && <span className="ml-1 font-sans text-footnote font-medium text-secondary">{unit}</span>}
      </p>
      {change && (
        <p className={`mt-auto text-caption font-semibold leading-tight ${toneClass}`}>
          {change.text}
          {change.tone === "flat" && <span className="sr-only"> vs last month</span>}
        </p>
      )}
    </div>
  );
}
