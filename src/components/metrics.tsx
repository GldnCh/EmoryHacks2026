// The health measures we show, with Health-app style icons. Icon colors are decoration only (text stays in text colors).
import type { ReactNode } from "react";
import { DropIcon, GaugeIcon, HeartIcon, MoonIcon, WalkIcon } from "@/components/Icons";

export interface MetricInfo {
  label: string;
  short: string;
  icon: ReactNode;
  accent: string;
}

export const METRICS = {
  steps: { label: "Steps per day", short: "Steps", icon: <WalkIcon size={15} strokeWidth={2.2} />, accent: "#e8590c" },
  heart: { label: "Resting heart rate", short: "Heart", icon: <HeartIcon size={15} strokeWidth={2.2} />, accent: "#e5383b" },
  sleep: { label: "Sleep", short: "Sleep", icon: <MoonIcon size={15} strokeWidth={2.2} />, accent: "#5856d6" },
  bp: { label: "Blood pressure", short: "BP", icon: <GaugeIcon size={15} strokeWidth={2.2} />, accent: "#d63384" },
  glucose: { label: "Fasting glucose", short: "Glucose", icon: <DropIcon size={15} strokeWidth={2.2} />, accent: "#8e44c9" },
} satisfies Record<string, MetricInfo>;

export type MetricKey = keyof typeof METRICS;
