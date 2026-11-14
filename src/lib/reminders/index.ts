// Medication reminders and dose tracking (server-only). Owner: Cam.
//
// A schedule = one medicine at fixed local times, copied from the prescription label by the person or their guardian.
// Each scheduled time on each day is a "dose" with a status:
//   taken / skipped  someone tapped it (saved in Tiger Data `dose_log`)
//   due              from 1 hour before to 2 hours after the time, not logged yet
//   upcoming         later today
//   missed           more than 2 hours late and not logged
// iCare never suggests doses or changes: it only records what the label says and what was taken.
import { tigerConfigured, tigerQuery } from "@/lib/tiger";
import { addDays, localDate, zonedInstant } from "./time";
import { DEMO_MISSES, DEMO_TIMEZONE, SEED_SCHEDULES } from "./seed";

export interface Schedule {
  id: number;
  accountId: string;
  medicine: string;
  label: string;
  times: string[];
  timezone: string;
  demo: boolean;
  createdAt: string;
}

export type DoseStatus = "taken" | "skipped" | "due" | "upcoming" | "missed";

export interface Dose {
  scheduleId: number;
  medicine: string;
  label: string;
  time: string; // local HH:MM
  date: string; // local YYYY-MM-DD
  scheduledFor: string; // ISO instant
  status: DoseStatus;
  loggedBy: string | null;
  loggedAt: string | null;
  generated: boolean; // demo history, not a real tap
}

const DUE_BEFORE_MS = 60 * 60 * 1000;
const LATE_AFTER_MS = 2 * 60 * 60 * 1000;

// ---------- storage: Tiger Data, or in memory when it isn't set up ----------
type LogRow = { schedule_id: number; scheduled_for: string; status: "taken" | "skipped"; logged_by: string; logged_at: string };
const mem = {
  schedules: SEED_SCHEDULES.map((s, i): Schedule => ({
    id: i + 1, accountId: s.accountId, medicine: s.medicine, label: s.label, times: s.times, timezone: DEMO_TIMEZONE, demo: true,
    createdAt: new Date(0).toISOString(),
  })),
  log: [] as LogRow[],
};

let ready: boolean | null = null;
async function db(): Promise<boolean> {
  if (!tigerConfigured()) return false;
  if (ready !== null) return ready;
  try {
    await tigerQuery("SELECT 1 FROM med_schedules LIMIT 1");
    ready = true;
  } catch {
    console.warn("[reminders] med_schedules not found in Tiger Data; using in-memory demo schedules. Run `npm run seed:app`.");
    ready = false;
  }
  return ready;
}

type ScheduleRow = { id: number; account_id: string; medicine: string; label: string; times: string[]; timezone: string; demo: boolean; created_at: Date };
const toSchedule = (r: ScheduleRow): Schedule => ({
  id: Number(r.id), accountId: r.account_id, medicine: r.medicine, label: r.label, times: r.times, timezone: r.timezone, demo: r.demo,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listSchedules(accountId: string): Promise<Schedule[]> {
  if (!(await db())) return mem.schedules.filter((s) => s.accountId === accountId);
  const rows = await tigerQuery<ScheduleRow>(
    "SELECT id, account_id, medicine, label, times, timezone, demo, created_at FROM med_schedules WHERE account_id = $1 AND active ORDER BY id",
    [accountId],
  );
  return rows.map(toSchedule);
}

export async function addSchedule(accountId: string, medicine: string, label: string, times: string[], createdBy: string): Promise<Schedule> {
  if (!(await db())) {
    const s: Schedule = {
      id: Math.max(0, ...mem.schedules.map((x) => x.id)) + 1, accountId, medicine, label, times, timezone: DEMO_TIMEZONE, demo: false,
      createdAt: new Date().toISOString(),
    };
    mem.schedules.push(s);
    return s;
  }
  const rows = await tigerQuery<ScheduleRow>(
    `INSERT INTO med_schedules (account_id, medicine, label, times, timezone, created_by) VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, account_id, medicine, label, times, timezone, demo, created_at`,
    [accountId, medicine, label, times, DEMO_TIMEZONE, createdBy],
  );
  return toSchedule(rows[0]);
}

export async function removeSchedule(accountId: string, scheduleId: number): Promise<boolean> {
  if (!(await db())) {
    const before = mem.schedules.length;
    mem.schedules = mem.schedules.filter((s) => !(s.id === scheduleId && s.accountId === accountId));
    return mem.schedules.length < before;
  }
  const rows = await tigerQuery("UPDATE med_schedules SET active = false WHERE id = $1 AND account_id = $2 AND active RETURNING id", [scheduleId, accountId]);
  return rows.length > 0;
}

async function logsFor(scheduleIds: number[], from: Date): Promise<LogRow[]> {
  if (!scheduleIds.length) return [];
  if (!(await db())) return mem.log.filter((l) => scheduleIds.includes(l.schedule_id) && new Date(l.scheduled_for) >= from);
  const rows = await tigerQuery<{ schedule_id: number; scheduled_for: Date; status: "taken" | "skipped"; logged_by: string; logged_at: Date }>(
    "SELECT schedule_id, scheduled_for, status, logged_by, logged_at FROM dose_log WHERE schedule_id = ANY($1::int[]) AND scheduled_for >= $2",
    [scheduleIds, from],
  );
  return rows.map((r) => ({
    schedule_id: Number(r.schedule_id), scheduled_for: new Date(r.scheduled_for).toISOString(), status: r.status, logged_by: r.logged_by,
    logged_at: new Date(r.logged_at).toISOString(),
  }));
}

export async function saveDoseLog(schedule: Schedule, scheduledFor: Date, status: "taken" | "skipped", loggedBy: string) {
  if (!(await db())) {
    mem.log = mem.log.filter((l) => !(l.schedule_id === schedule.id && l.scheduled_for === scheduledFor.toISOString()));
    mem.log.push({ schedule_id: schedule.id, scheduled_for: scheduledFor.toISOString(), status, logged_by: loggedBy, logged_at: new Date().toISOString() });
    return;
  }
  await tigerQuery(
    `INSERT INTO dose_log (schedule_id, account_id, scheduled_for, status, logged_by) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (schedule_id, scheduled_for) DO UPDATE SET status = EXCLUDED.status, logged_by = EXCLUDED.logged_by, logged_at = now()`,
    [schedule.id, schedule.accountId, scheduledFor, status, loggedBy],
  );
}

// ---------- doses ----------
function isDemoMiss(s: Schedule, time: string, date: string, today: string) {
  return DEMO_MISSES.some((m) => m.accountId === s.accountId && m.medicine === s.medicine && m.time === time && addDays(today, -m.daysAgo) === date);
}

/** Every dose of these schedules from `days` days ago through the end of today, oldest first. */
export async function dosesFor(schedules: Schedule[], days = 7, now = new Date()): Promise<Dose[]> {
  if (!schedules.length) return [];
  const tz = schedules[0].timezone || DEMO_TIMEZONE;
  const today = localDate(now, tz);
  const firstDay = addDays(today, -(days - 1));
  const logs = await logsFor(schedules.map((s) => s.id), zonedInstant(firstDay, "00:00", tz));
  const doses: Dose[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(firstDay, i);
    for (const s of schedules) {
      for (const time of s.times) {
        const at = zonedInstant(date, time, s.timezone || tz);
        // a schedule added in the app starts counting from when it was added
        if (!s.demo && at.getTime() < new Date(s.createdAt).getTime()) continue;
        const log = logs.find((l) => l.schedule_id === s.id && new Date(l.scheduled_for).getTime() === at.getTime());
        const late = now.getTime() - at.getTime();
        let status: DoseStatus;
        let generated = false;
        if (log) status = log.status;
        else if (late < -DUE_BEFORE_MS) status = "upcoming";
        else if (late <= LATE_AFTER_MS) status = "due";
        else if (s.demo && !isDemoMiss(s, time, date, today)) {
          status = "taken";
          generated = true;
        } else status = "missed";
        doses.push({
          scheduleId: s.id, medicine: s.medicine, label: s.label, time, date, scheduledFor: at.toISOString(), status,
          loggedBy: log?.logged_by ?? null, loggedAt: log?.logged_at ?? null, generated,
        });
      }
    }
  }
  return doses.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.medicine.localeCompare(b.medicine));
}

export function adherence(doses: Dose[]) {
  const counted = doses.filter((d) => d.status === "taken" || d.status === "missed" || d.status === "skipped");
  const taken = counted.filter((d) => d.status === "taken").length;
  return { taken, missed: counted.filter((d) => d.status === "missed").length, skipped: counted.filter((d) => d.status === "skipped").length, total: counted.length, percent: counted.length ? Math.round((taken / counted.length) * 100) : null };
}

/** Missed doses in the last `hours` hours (for family alerts). */
export async function recentMisses(accountId: string, hours = 72, now = new Date()) {
  const doses = await dosesFor(await listSchedules(accountId), Math.ceil(hours / 24) + 1, now);
  return doses.filter((d) => d.status === "missed" && now.getTime() - new Date(d.scheduledFor).getTime() <= hours * 3600_000);
}
