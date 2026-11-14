"use client";
// "Zoom into a day": hourly heart rate (average line inside a min-max band) and hourly steps (bars).
// Two separate charts on purpose: heart rate and steps have different scales, so they never share an axis.
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourRow } from "@/components/types";

const AXIS = { fontSize: 11, fill: "var(--text-muted)" };
const TOOLTIP = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--foreground)",
};

export function hourLabel(h: number): string {
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${h < 12 ? "AM" : "PM"}`;
}

export default function DayCharts({ hours }: { hours: HourRow[] }) {
  const data = hours.map((h) => ({ ...h, label: hourLabel(h.hour), range: [h.minHeartRate, h.maxHeartRate] }));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <figure>
        <figcaption className="mb-1 text-sm font-medium">Heart rate by hour</figcaption>
        <p className="mb-2 text-xs text-muted">Line: hourly average. Shaded band: lowest to highest reading that hour.</p>
        <div role="img" aria-label="Hourly heart rate with minimum to maximum range" className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--grid)" }} interval={5} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(v, name) => [Array.isArray(v) ? `${v[0]}–${v[1]} bpm` : `${v} bpm`, name]}
              />
              <Area dataKey="range" name="Range" stroke="none" fill="var(--series-1)" fillOpacity={0.15} isAnimationActive={false} />
              <Line dataKey="avgHeartRate" name="Average" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </figure>

      <figure>
        <figcaption className="mb-1 text-sm font-medium">Steps by hour</figcaption>
        <p className="mb-2 text-xs text-muted">Total: {hours.reduce((a, h) => a + h.steps, 0).toLocaleString("en-US")} steps</p>
        <div role="img" aria-label="Steps per hour" className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--grid)" }} interval={5} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--surface-muted)" }} formatter={(v) => [`${Number(v).toLocaleString("en-US")} steps`, "Steps"]} />
              <Bar dataKey="steps" name="Steps" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}
