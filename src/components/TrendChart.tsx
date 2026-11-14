"use client";
// Line chart wrapper around recharts. One y-axis only; two measures with different scales get two charts.
// Optional story markers (e.g. "Started walking") are drawn as a shaded band or a thin vertical line.
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Series {
  key: string;
  name: string;
  /** CSS color; defaults to the chart palette in order (blue, orange). */
  color?: string;
}

export interface Marker {
  /** x value where the marker starts (same type as the x-axis data, e.g. "2026-03") */
  from: string;
  /** omit for a single vertical line */
  to?: string;
  label: string;
  /** For single-line markers: which side of the line the label sits on (avoids labels colliding). */
  side?: "left" | "right";
}

interface TrendChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  unit?: string;
  decimals?: number;
  height?: number;
  formatX?: (x: string) => string;
  formatTooltipX?: (x: string) => string;
  markers?: Marker[];
  /** Line charts zoom to the data by default; set to start the y-axis at zero. */
  zeroBased?: boolean;
  ariaLabel: string;
}

const PALETTE = ["var(--series-1)", "var(--series-2)"];
const AXIS = { fontSize: 11, fill: "var(--text-muted)" };

export default function TrendChart({
  data,
  xKey,
  series,
  unit = "",
  decimals = 0,
  height = 200,
  formatX = (x) => x,
  formatTooltipX = formatX,
  markers = [],
  zeroBased = false,
  ariaLabel,
}: TrendChartProps) {
  const fmt = (v: unknown) =>
    typeof v === "number" ? `${v.toLocaleString("en-US", { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ""}` : "–";

  return (
    <div role="img" aria-label={ariaLabel} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey={xKey} tickFormatter={formatX} tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--grid)" }} minTickGap={16} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={zeroBased ? [0, "auto"] : ["auto", "auto"]}
            tickFormatter={(v: number) => (Math.abs(v) >= 10000 ? `${v / 1000}K` : v.toLocaleString("en-US"))}
          />
          {markers.map((m) =>
            m.to ? (
              <ReferenceArea
                key={m.label}
                x1={m.from}
                x2={m.to}
                fill="var(--text-muted)"
                fillOpacity={0.08}
                label={{ value: m.label, position: "insideTop", fontSize: 11, fill: "var(--text-secondary)" }}
              />
            ) : (
              <ReferenceLine
                key={m.label}
                x={m.from}
                stroke="var(--text-muted)"
                strokeDasharray="0"
                label={{
                  value: m.label,
                  // a vertical line has zero width: "insideTopLeft" draws the text to its right, "insideTopRight" to its left
                  position: m.side === "left" ? "insideTopRight" : m.side === "right" ? "insideTopLeft" : "top",
                  fontSize: 11,
                  fill: "var(--text-secondary)",
                }}
              />
            ),
          )}
          <Tooltip
            formatter={(v, name) => [fmt(v), name]}
            labelFormatter={(x) => formatTooltipX(String(x))}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
          />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
