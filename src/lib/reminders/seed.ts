// Demo medicine schedules for the fictional Rivera family, used by `npm run seed:app` and as the in-memory
// store when Tiger Data isn't connected. Times follow each (fictional) prescription label; iCare never sets doses.
//
// Demo history: for schedules marked `demo`, doses before today are generated relative to TODAY (taken, except
// the misses below), so the story is always fresh at demo time. Anything someone taps in the app is real and
// saved in Tiger Data (`dose_log`), and overrides the generated history.

export interface SeedSchedule {
  accountId: string;
  medicine: string; // id in src/data/medicines.json, e.g. "metformin"
  label: string; // what the label says, shown as-is
  times: string[]; // local "HH:MM"
}

export const DEMO_TIMEZONE = "America/New_York";

export const SEED_SCHEDULES: SeedSchedule[] = [
  { accountId: "jordan", medicine: "lisinopril", label: "1 tablet in the morning", times: ["08:00"] },
  { accountId: "sam", medicine: "cetirizine", label: "1 tablet daily", times: ["08:00"] },
  { accountId: "rosa", medicine: "metformin", label: "1 tablet with breakfast and dinner", times: ["08:00", "20:00"] },
  { accountId: "rosa", medicine: "amlodipine", label: "1 tablet in the morning", times: ["08:00"] },
  { accountId: "rosa", medicine: "atorvastatin", label: "1 tablet in the evening", times: ["20:00"] },
  // Mia's albuterol inhaler is "as needed", so it has no schedule.
];

/** Generated misses, as days before today: Rosa missed her evening pills yesterday and 3 days ago. */
export const DEMO_MISSES: { accountId: string; medicine: string; time: string; daysAgo: number }[] = [
  { accountId: "rosa", medicine: "metformin", time: "20:00", daysAgo: 1 },
  { accountId: "rosa", medicine: "atorvastatin", time: "20:00", daysAgo: 1 },
  { accountId: "rosa", medicine: "metformin", time: "20:00", daysAgo: 3 },
  { accountId: "rosa", medicine: "atorvastatin", time: "20:00", daysAgo: 3 },
];
