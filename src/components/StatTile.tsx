// Big number + label + change vs last month.
// Green with "improving" when the change goes the healthy way, amber with "worsening" when it doesn't.
// The arrow and word always go with the color, so meaning never depends on color alone.

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
}

export function fmt(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function StatTile({ label, value, unit, decimals = 0, previous, betterWhen = "up", display }: StatTileProps) {
  let change: { text: string; tone: "good" | "warn" | "flat" } | null = null;
  if (value != null && previous != null) {
    const diff = Number((value - previous).toFixed(decimals));
    if (diff === 0) {
      change = { text: "→ no change vs last month", tone: "flat" };
    } else {
      const improving = betterWhen === "up" ? diff > 0 : diff < 0;
      change = {
        text: `${diff > 0 ? "↑" : "↓"} ${fmt(Math.abs(diff), decimals)}${unit ? ` ${unit}` : ""} · ${improving ? "improving" : "worsening"}`,
        tone: improving ? "good" : "warn",
      };
    }
  }
  const toneClass =
    change?.tone === "good" ? "bg-good-soft text-good" : change?.tone === "warn" ? "bg-warn-soft text-warn" : "text-muted";

  return (
    <div className="rounded-xl bg-surface-muted p-3">
      <p className="text-xs font-medium text-secondary">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight">
        {display ?? fmt(value, decimals)}
        {unit && <span className="ml-1 text-sm font-normal text-secondary">{unit}</span>}
      </p>
      {change && <p className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${toneClass}`}>{change.text}</p>}
    </div>
  );
}
