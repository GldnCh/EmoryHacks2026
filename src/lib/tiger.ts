// Tiger Data (TimescaleDB) access for health trends. Server-only: uses a secret connection string.
// If TIGER_DATABASE_URL isn't set, callers fall back to the in-memory sample data.
import { Pool } from "pg";
import type { MonthlySummary } from "@/lib/sample-data/health";

let pool: Pool | null = null;

export const tigerConfigured = () => Boolean(process.env.TIGER_DATABASE_URL);

function getPool() {
  if (!process.env.TIGER_DATABASE_URL) throw new Error("TIGER_DATABASE_URL is missing. See docs/API-KEYS.md.");
  pool ??= new Pool({ connectionString: process.env.TIGER_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
  return pool;
}

/**
 * Monthly averages computed inside the database with TimescaleDB's time_bucket().
 * period: "1 month" for monthly reports, "1 week" for finer charts.
 */
export async function getTrendsFromTiger(memberId: string, period: "1 week" | "1 month" = "1 month"): Promise<MonthlySummary[]> {
  const { rows } = await getPool().query(
    `SELECT to_char(time_bucket($2::interval, day), 'YYYY-MM-DD') AS bucket,
            count(*)::int                                  AS days,
            round(avg(steps))::int                         AS avg_steps,
            round(avg(resting_heart_rate)::numeric, 1)::float AS avg_rhr,
            round(avg(sleep_hours)::numeric, 1)::float      AS avg_sleep,
            sum(exercise_minutes)::int                     AS total_exercise,
            round(avg(systolic))::int                      AS avg_sys,
            round(avg(diastolic))::int                     AS avg_dia,
            round(avg(blood_glucose))::int                 AS avg_glucose
       FROM health_metrics
      WHERE member_id = $1
      GROUP BY bucket
      ORDER BY bucket`,
    [memberId, period],
  );
  return rows.map((r) => ({
    month: period === "1 month" ? r.bucket.slice(0, 7) : r.bucket,
    days: r.days,
    avgSteps: r.avg_steps,
    avgRestingHeartRate: r.avg_rhr,
    avgSleepHours: r.avg_sleep,
    totalExerciseMinutes: r.total_exercise,
    ...(r.avg_sys != null ? { avgSystolic: r.avg_sys, avgDiastolic: r.avg_dia } : {}),
    ...(r.avg_glucose != null ? { avgBloodGlucose: r.avg_glucose } : {}),
  }));
}
