// Shapes of the API responses the pages read (the routes themselves belong to Jam).

export interface Member {
  id: string;
  name: string;
  relationship: "self" | "spouse" | "child" | "parent";
  age: number;
  sex: string;
  conditions: string[];
  medications: string[];
  notes: string;
  location: { city: string; state: string; zip: string };
}

export interface TrendRow {
  month: string; // YYYY-MM
  days: number;
  avgSteps: number;
  avgRestingHeartRate: number;
  avgSleepHours: number;
  totalExerciseMinutes: number;
  avgSystolic?: number;
  avgDiastolic?: number;
  avgBloodGlucose?: number;
}

export interface TrendsResponse {
  memberId: string;
  source: string;
  from?: string;
  queryMs?: number;
  trends: TrendRow[];
}

export interface HourRow {
  hour: number;
  avgHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  steps: number;
}

export interface VitalsResponse {
  memberId: string;
  date: string;
  source: string;
  from?: string;
  queryMs?: number;
  hours: HourRow[];
}

export interface MedlineInfo {
  title: string;
  summary?: string;
  url: string;
  source?: string;
}

export interface ProfileResponse {
  member: Member;
  conditions: { name: string; icd10?: string; specialty?: string; plainName?: string; explanation: MedlineInfo | null }[];
  medications: {
    id: string;
    rxcui: string | null;
    sample: { genericName: string; brandNames: string[]; drugClass: string; commonUses: string[] } | null;
    info: MedlineInfo | null;
  }[];
  disclaimer: string;
}

export const RELATIONSHIP: Record<Member["relationship"], string> = {
  self: "You",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03" -> "Mar '26" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
}

/** "2026-03" -> "March 2026"-style long label for tooltips */
export function monthLong(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}
