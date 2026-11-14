// Tiger Data (TimescaleDB) access. Server-only: uses a secret connection string.
// Every function returns how long the database took (queryMs) so the demo can show the speed.
// If TIGER_DATABASE_URL isn't set, API routes fall back to the in-memory sample data.
import { Pool } from "pg";
import type { MonthlySummary } from "@/lib/sample-data/health";
import { tigerConnectionConfig } from "@/lib/tiger-ca";

let pool: Pool | null = null;

export const tigerConfigured = () => Boolean(process.env.TIGER_DATABASE_URL);

function getPool() {
  if (!process.env.TIGER_DATABASE_URL) throw new Error("TIGER_DATABASE_URL is missing. See docs/API-KEYS.md.");
  pool ??= new Pool({ ...tigerConnectionConfig(process.env.TIGER_DATABASE_URL), max: 3 });
  return pool;
}

async function timed<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const t = performance.now();
  const { rows } = await getPool().query(sql, params);
  return { rows: rows as T[], queryMs: Math.round((performance.now() - t) * 10) / 10 };
}

const num = (v: unknown) => (v == null ? undefined : Math.round(Number(v) * 10) / 10);
const int = (v: unknown) => (v == null ? undefined : Math.round(Number(v)));

/** Monthly trends from the `health_monthly` continuous aggregate; weekly trends computed with time_bucket(). */
export async function getTrendsFromTiger(memberId: string, period: "1 week" | "1 month" = "1 month") {
  const sql =
    period === "1 month"
      ? `SELECT to_char(month, 'YYYY-MM') AS bucket, days, avg_steps, avg_rhr, avg_sleep, total_exercise, avg_sys, avg_dia, avg_glucose
           FROM health_monthly WHERE member_id = $1 ORDER BY month`
      : `SELECT to_char(time_bucket(INTERVAL '1 week', day), 'YYYY-MM-DD') AS bucket, count(*)::int AS days,
                avg(steps) AS avg_steps, avg(resting_heart_rate) AS avg_rhr, avg(sleep_hours) AS avg_sleep,
                sum(exercise_minutes)::int AS total_exercise, avg(systolic) AS avg_sys, avg(diastolic) AS avg_dia,
                avg(blood_glucose) AS avg_glucose
           FROM health_metrics WHERE member_id = $1 GROUP BY 1 ORDER BY 1`;
  const { rows, queryMs } = await timed<Record<string, unknown>>(sql, [memberId]);
  const trends: MonthlySummary[] = rows.map((r) => ({
    month: String(r.bucket),
    days: Number(r.days),
    avgSteps: int(r.avg_steps)!,
    avgRestingHeartRate: num(r.avg_rhr)!,
    avgSleepHours: num(r.avg_sleep)!,
    totalExerciseMinutes: Number(r.total_exercise),
    ...(r.avg_sys != null ? { avgSystolic: int(r.avg_sys), avgDiastolic: int(r.avg_dia) } : {}),
    ...(r.avg_glucose != null ? { avgBloodGlucose: int(r.avg_glucose) } : {}),
  }));
  return { trends, queryMs, from: period === "1 month" ? "continuous aggregate health_monthly" : "health_metrics hypertable" };
}

/** One day, hour by hour, from the `vitals_hourly` continuous aggregate (built from minute readings). */
export async function getHourlyFromTiger(memberId: string, date: string) {
  const { rows, queryMs } = await timed<Record<string, unknown>>(
    `SELECT extract(hour FROM hour AT TIME ZONE 'Etc/GMT+5')::int AS h, avg_hr, min_hr, max_hr, steps
       FROM vitals_hourly
      WHERE member_id = $1 AND hour >= ($2::date)::timestamp AT TIME ZONE 'Etc/GMT+5'
        AND hour < ($2::date + 1)::timestamp AT TIME ZONE 'Etc/GMT+5'
      ORDER BY hour`,
    [memberId, date],
  );
  return {
    hours: rows.map((r) => ({
      hour: Number(r.h),
      avgHeartRate: int(r.avg_hr)!,
      minHeartRate: Number(r.min_hr),
      maxHeartRate: Number(r.max_hr),
      steps: Number(r.steps),
    })),
    queryMs,
  };
}

/** Everyone with a given condition: relational profiles JOINed with the monthly time-series aggregate. */
export async function getCohortFromTiger(condition: string) {
  const { rows, queryMs } = await timed<Record<string, unknown>>(
    `SELECT f.id, f.name, f.relationship, to_char(m.month, 'YYYY-MM') AS month,
            m.avg_sys, m.avg_dia, m.avg_glucose, m.avg_rhr, m.avg_steps
       FROM family_members f
       JOIN health_monthly m ON m.member_id = f.id
      WHERE $1 = ANY (f.conditions) OR EXISTS (SELECT 1 FROM unnest(f.conditions) c WHERE c ILIKE '%' || $1 || '%')
      ORDER BY f.id, m.month`,
    [condition],
  );
  return { rows, queryMs };
}

/** Numbers for the demo: data volume, compression and raw-vs-aggregate query speed. */
export async function getTigerStats() {
  const counts = await timed<Record<string, unknown>>(
    `SELECT (SELECT count(*) FROM family_members)::int AS members,
            (SELECT count(*) FROM health_metrics)::int AS daily_rows,
            (SELECT count(*) FROM vitals_minute)::bigint AS minute_rows,
            (SELECT count(*) FROM timescaledb_information.chunks WHERE hypertable_name = 'vitals_minute')::int AS chunks,
            (SELECT count(*) FROM timescaledb_information.chunks WHERE hypertable_name = 'vitals_minute' AND is_compressed)::int AS compressed_chunks,
            hypertable_size('vitals_minute')::bigint AS minute_bytes`,
  );
  let compression: Record<string, unknown> | null = null;
  try {
    const { rows } = await getPool().query(
      `SELECT before_compression_total_bytes AS before, after_compression_total_bytes AS after
         FROM hypertable_compression_stats('vitals_minute')`,
    );
    compression = rows[0] ?? null;
  } catch {
    compression = null; // older/newer versions name this differently; sizes above still work
  }
  const raw = await timed(
    `SELECT time_bucket(INTERVAL '1 day', ts) AS d, avg(heart_rate), sum(steps)
       FROM vitals_minute WHERE member_id = 'jordan' GROUP BY d`,
  );
  const cagg = await timed(`SELECT day, avg_hr, steps FROM vitals_daily WHERE member_id = 'jordan'`);
  const caggs = await timed<{ view_name: string }>(
    `SELECT view_name FROM timescaledb_information.continuous_aggregates ORDER BY view_name`,
  );

  const c = counts.rows[0];
  const before = Number(compression?.before ?? 0);
  const after = Number(compression?.after ?? 0);
  return {
    members: Number(c.members),
    dailyRows: Number(c.daily_rows),
    minuteRows: Number(c.minute_rows),
    chunks: Number(c.chunks),
    compressedChunks: Number(c.compressed_chunks),
    minuteTableMB: Math.round(Number(c.minute_bytes) / 1024 / 102.4) / 10,
    compression: before > 0 ? { beforeMB: Math.round(before / 104857.6) / 10, afterMB: Math.round(after / 104857.6) / 10, savedPercent: Math.round((1 - after / before) * 100) } : null,
    continuousAggregates: caggs.rows.map((r) => r.view_name),
    benchmark: {
      question: "Jordan's daily heart rate and steps for a full year",
      rawMinuteDataMs: raw.queryMs,
      continuousAggregateMs: cagg.queryMs,
      speedup: cagg.queryMs > 0 ? Math.round((raw.queryMs / cagg.queryMs) * 10) / 10 : null,
    },
  };
}
