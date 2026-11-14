// Sample health data shaped like Apple Health (HealthKit) output.
// FABRICATED for the demo: fictional people, generated numbers. Not real patient data.
//
// The data is generated deterministically (same seed -> same numbers every time),
// so everyone on the team sees identical charts and the repo stays small.
// When a real HealthKit connection exists, replace getDailyMetrics() with real data
// in the same shape and the dashboard/summaries keep working.

export type Sex = "female" | "male";

export interface FamilyMember {
  id: string;
  name: string;
  relationship: "self" | "spouse" | "child" | "parent";
  age: number;
  sex: Sex;
  conditions: string[];
  medications: string[]; // ids from src/data/medicines.json
  notes: string; // the "story" the data tells, useful for demo summaries
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  steps: number;
  restingHeartRate: number; // bpm
  sleepHours: number;
  activeEnergyKcal: number;
  exerciseMinutes: number;
  bloodPressure?: { systolic: number; diastolic: number }; // only for members who track it
  bloodGlucose?: number; // mg/dL, morning fasting, only for members who track it
}

export interface MonthlySummary {
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

/** Maps our field names to the Apple HealthKit identifiers they stand in for. */
export const APPLE_HEALTH_TYPES: Record<keyof Omit<DailyMetrics, "date">, string> = {
  steps: "HKQuantityTypeIdentifierStepCount",
  restingHeartRate: "HKQuantityTypeIdentifierRestingHeartRate",
  sleepHours: "HKCategoryTypeIdentifierSleepAnalysis",
  activeEnergyKcal: "HKQuantityTypeIdentifierActiveEnergyBurned",
  exerciseMinutes: "HKQuantityTypeIdentifierAppleExerciseTime",
  bloodPressure: "HKCorrelationTypeIdentifierBloodPressure",
  bloodGlucose: "HKQuantityTypeIdentifierBloodGlucose",
};

/** Data covers 12 full months so yearly summaries work. */
export const SAMPLE_START = "2025-11-01";
export const SAMPLE_END = "2026-10-31";

export const FAMILY: FamilyMember[] = [
  {
    id: "jordan",
    name: "Jordan Rivera",
    relationship: "self",
    age: 45,
    sex: "male",
    conditions: ["Prediabetes", "Mild hypertension"],
    medications: ["lisinopril"],
    notes:
      "Started a walking routine in March 2026: steps rise, resting heart rate, blood pressure and fasting glucose improve through the year. Had the flu in late January (low steps, high heart rate, more sleep).",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    relationship: "spouse",
    age: 43,
    sex: "female",
    conditions: ["Seasonal allergies"],
    medications: ["cetirizine"],
    notes:
      "Consistently active runner. Sleep dropped during a stressful work stretch in August–September 2026, with a small rise in resting heart rate.",
  },
  {
    id: "mia",
    name: "Mia Rivera",
    relationship: "child",
    age: 12,
    sex: "female",
    conditions: ["Mild asthma"],
    medications: ["albuterol"],
    notes:
      "Very active during the school sports season (Sept–Nov, Mar–May), less active in summer. Sleeps less in summer.",
  },
  {
    id: "rosa",
    name: "Rosa Rivera",
    relationship: "parent",
    age: 71,
    sex: "female",
    conditions: ["Type 2 diabetes", "Hypertension", "High cholesterol"],
    medications: ["metformin", "amlodipine", "atorvastatin"],
    notes:
      "Lives in another city; the family tracks her health remotely. Blood pressure crept up in June–July 2026 (possible missed doses), then improved after a medication review in August.",
  },
];

// ---------- deterministic random numbers ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
/** Roughly normal noise, mean 0, sd 1. */
function gauss(rand: () => number) {
  return rand() + rand() + rand() + rand() + rand() + rand() - 3;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

function eachDay(start: string, end: string): Date[] {
  const days: Date[] = [];
  const d = new Date(start + "T12:00:00Z");
  const last = new Date(end + "T12:00:00Z");
  while (d <= last) {
    days.push(new Date(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** 0 at the start of the data, 1 at the end. */
const progress = (d: Date) =>
  (d.getTime() - new Date(SAMPLE_START + "T12:00:00Z").getTime()) /
  (new Date(SAMPLE_END + "T12:00:00Z").getTime() - new Date(SAMPLE_START + "T12:00:00Z").getTime());
const inRange = (d: Date, from: string, to: string) => {
  const s = iso(d);
  return s >= from && s <= to;
};
/** -1 in mid-winter, +1 in mid-summer (Atlanta-ish seasons). */
const season = (d: Date) => -Math.cos(((d.getUTCMonth() + d.getUTCDate() / 30) / 12) * 2 * Math.PI);

// ---------- per-member generators ----------
function generate(member: FamilyMember): DailyMetrics[] {
  const rand = mulberry32(seedFrom(member.id));
  return eachDay(SAMPLE_START, SAMPLE_END).map((d) => {
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const s = season(d);
    const n = () => gauss(rand);
    let steps = 0, rhr = 0, sleep = 0, exercise = 0;
    let bp: DailyMetrics["bloodPressure"];
    let glucose: number | undefined;

    switch (member.id) {
      case "jordan": {
        const walking = iso(d) >= "2026-03-01" ? clamp((progress(d) - 0.33) / 0.4, 0, 1) : 0;
        steps = 4200 + 5200 * walking + 600 * s + (weekend ? 900 : 0) + 1100 * n();
        exercise = 8 + 32 * walking + 6 * n();
        rhr = 76 - 9 * walking + 1.5 * n();
        sleep = 6.4 + 0.5 * walking + (weekend ? 0.6 : 0) + 0.45 * n();
        bp = { systolic: 138 - 12 * walking + 4 * n(), diastolic: 88 - 7 * walking + 3 * n() };
        glucose = 112 - 14 * walking + 4 * n();
        if (inRange(d, "2026-01-24", "2026-01-31")) {
          steps *= 0.3; rhr += 9; sleep += 1.6; exercise = 0; glucose += 8;
        }
        break;
      }
      case "sam": {
        const stress = inRange(d, "2026-08-04", "2026-09-26") ? 1 : 0;
        steps = 10500 + 900 * s + (weekend ? 2500 : 0) - 1200 * stress + 1500 * n();
        exercise = 42 + (weekend ? 20 : 0) - 12 * stress + 10 * n();
        rhr = 58 + 4 * stress + 1.2 * n();
        sleep = 7.4 - 1.1 * stress + (weekend ? 0.5 : 0) + 0.4 * n();
        break;
      }
      case "mia": {
        const m = d.getUTCMonth(); // 0 = Jan
        const sports = [8, 9, 10, 2, 3, 4].includes(m) ? 1 : 0;
        const summer = [5, 6, 7].includes(m) ? 1 : 0;
        steps = 9000 + 3500 * sports - 2500 * summer + (weekend ? -800 : 0) + 1600 * n();
        exercise = 35 + 30 * sports - 15 * summer + 10 * n();
        rhr = 78 - 3 * sports + 2 * n();
        sleep = 9.2 - 0.9 * summer + (weekend ? 0.7 : 0) + 0.5 * n();
        break;
      }
      case "rosa": {
        const missed = inRange(d, "2026-06-01", "2026-07-31") ? 1 : 0;
        const reviewed = iso(d) >= "2026-08-10" ? 1 : 0;
        steps = 3600 + 700 * s + 700 * n();
        exercise = 12 + 3 * s + 4 * n();
        rhr = 72 + 3 * missed - 2 * reviewed + 1.5 * n();
        sleep = 6.9 + 0.5 * n();
        bp = {
          systolic: 136 + 14 * missed - 8 * reviewed + 5 * n(),
          diastolic: 82 + 7 * missed - 4 * reviewed + 3 * n(),
        };
        glucose = 138 + 18 * missed - 12 * reviewed + 8 * n();
        break;
      }
    }

    const metrics: DailyMetrics = {
      date: iso(d),
      steps: Math.round(clamp(steps, 300, 30000)),
      restingHeartRate: Math.round(clamp(rhr, 40, 120)),
      sleepHours: round1(clamp(sleep, 3, 12)),
      exerciseMinutes: Math.round(clamp(exercise, 0, 180)),
      activeEnergyKcal: 0,
    };
    metrics.activeEnergyKcal = Math.round(metrics.steps * 0.04 + metrics.exerciseMinutes * 5);
    if (bp) metrics.bloodPressure = { systolic: Math.round(bp.systolic), diastolic: Math.round(bp.diastolic) };
    if (glucose !== undefined) metrics.bloodGlucose = Math.round(glucose);
    return metrics;
  });
}

const cache = new Map<string, DailyMetrics[]>();

// ---------- public API ----------
export function getFamily(): FamilyMember[] {
  return FAMILY;
}

export function getMember(memberId: string): FamilyMember | undefined {
  return FAMILY.find((m) => m.id === memberId);
}

/** Daily metrics for one member, optionally limited to one month ("2026-10"). */
export function getDailyMetrics(memberId: string, month?: string): DailyMetrics[] {
  const member = getMember(memberId);
  if (!member) return [];
  if (!cache.has(memberId)) cache.set(memberId, generate(member));
  const all = cache.get(memberId)!;
  return month ? all.filter((d) => d.date.startsWith(month)) : all;
}

/** One summary row per month: the input for monthly and yearly health reports. */
export function getMonthlySummaries(memberId: string): MonthlySummary[] {
  const byMonth = new Map<string, DailyMetrics[]>();
  for (const d of getDailyMetrics(memberId)) {
    const m = d.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(d);
  }
  const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  return [...byMonth.entries()].map(([month, days]) => {
    const row: MonthlySummary = {
      month,
      days: days.length,
      avgSteps: Math.round(avg(days.map((d) => d.steps))),
      avgRestingHeartRate: avg(days.map((d) => d.restingHeartRate)),
      avgSleepHours: avg(days.map((d) => d.sleepHours)),
      totalExerciseMinutes: days.reduce((a, d) => a + d.exerciseMinutes, 0),
    };
    const bp = days.filter((d) => d.bloodPressure);
    if (bp.length) {
      row.avgSystolic = Math.round(avg(bp.map((d) => d.bloodPressure!.systolic)));
      row.avgDiastolic = Math.round(avg(bp.map((d) => d.bloodPressure!.diastolic)));
    }
    const g = days.filter((d) => d.bloodGlucose !== undefined);
    if (g.length) row.avgBloodGlucose = Math.round(avg(g.map((d) => d.bloodGlucose!)));
    return row;
  });
}
