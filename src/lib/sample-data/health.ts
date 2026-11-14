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
  location: { city: string; state: string; zip: string }; // used by the specialist finder
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
    location: { city: "Atlanta", state: "GA", zip: "30322" },
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
    location: { city: "Atlanta", state: "GA", zip: "30322" },
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
    location: { city: "Atlanta", state: "GA", zip: "30322" },
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
    location: { city: "Savannah", state: "GA", zip: "31401" },
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

// ---------- minute-level vitals (Apple Watch-style) ----------
// One reading per minute: heart rate + steps. 4 people x 365 days x 1,440 minutes = ~2.1 million rows.
// Built from that day's DailyMetrics, so minute data always adds up to the daily totals' story
// (resting HR while asleep, workouts at the member's usual time, flu week, etc.).

export interface MinuteVital {
  minute: number; // 0..1439, local time (fixed UTC-5 / Eastern Standard Time, no DST shift; Tiger queries use Etc/GMT+5)
  heartRate: number; // bpm
  steps: number;
}

/** When each member usually works out (minute of day) and how intense it is. */
const WORKOUT: Record<string, { start: number; intensity: number }> = {
  jordan: { start: 6 * 60 + 30, intensity: 45 }, // brisk morning walk
  sam: { start: 18 * 60, intensity: 75 }, // evening run
  mia: { start: 16 * 60, intensity: 65 }, // after-school sports
  rosa: { start: 9 * 60 + 30, intensity: 25 }, // gentle morning walk
};

export function getMinuteVitals(memberId: string, date: string): MinuteVital[] {
  const day = getDailyMetrics(memberId).find((d) => d.date === date);
  if (!day) return [];
  const rand = mulberry32(seedFrom(`${memberId}:${date}`));
  const n = () => gauss(rand);

  // sleep window: wake around 6:30 (+/- 30 min), sleep `sleepHours` before that
  const wake = Math.round(390 + 20 * n());
  const bed = Math.round(wake + (24 - day.sleepHours) * 60);
  const asleep = (m: number) => m < wake || m >= Math.min(bed, 1440);

  const plan = WORKOUT[memberId] ?? { start: 17 * 60, intensity: 50 };
  const wStart = plan.start + Math.round(15 * n());
  const wEnd = wStart + day.exerciseMinutes;
  const working = (m: number) => m >= wStart && m < wEnd;

  // spread the day's steps over waking minutes: most minutes idle, some light walking, workout minutes heavy
  const weights = Array.from({ length: 1440 }, (_, m) => {
    if (asleep(m)) return 0;
    if (working(m)) return 6 + rand() * 2;
    return rand() < 0.28 ? 0.5 + rand() : 0;
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  return weights.map((w, m) => {
    const steps = Math.min(190, Math.round((day.steps * w) / total));
    let hr: number;
    if (asleep(m)) hr = day.restingHeartRate - 4 + 1.5 * n();
    else if (working(m)) hr = day.restingHeartRate + plan.intensity + 6 * n();
    else hr = day.restingHeartRate + 12 + Math.min(45, steps * 0.35) + 4 * n();
    return { minute: m, heartRate: Math.round(clamp(hr, 38, 195)), steps };
  });
}

/** Hourly roll-up of one day (used when Tiger Data isn't connected). */
export function getHourlyVitals(memberId: string, date: string) {
  const mins = getMinuteVitals(memberId, date);
  return Array.from({ length: 24 }, (_, h) => {
    const slice = mins.slice(h * 60, h * 60 + 60);
    const hrs = slice.map((s) => s.heartRate);
    return {
      hour: h,
      avgHeartRate: slice.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / slice.length) : 0,
      minHeartRate: slice.length ? Math.min(...hrs) : 0,
      maxHeartRate: slice.length ? Math.max(...hrs) : 0,
      steps: slice.reduce((a, s) => a + s.steps, 0),
    };
  });
}
