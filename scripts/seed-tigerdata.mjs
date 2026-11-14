// Loads the sample Rivera family health history into Tiger Data (TimescaleDB).
//   npm run seed:tiger            -> create tables + load 4 x 365 days
//   npm run seed:tiger -- --dry-run  -> just show what would be loaded (no database needed)
// Needs TIGER_DATABASE_URL in .env.local (see docs/API-KEYS.md). Safe to re-run (upserts).
import { readFile } from "node:fs/promises";
import pg from "pg";
// Node 22.18+ runs TypeScript files directly, so we reuse the exact same generator as the app.
import { getFamily, getDailyMetrics } from "../src/lib/sample-data/health.ts";

const dryRun = process.argv.includes("--dry-run");
const family = getFamily();
const rows = family.flatMap((m) => getDailyMetrics(m.id).map((d) => ({ member: m.id, ...d })));
console.log(`Prepared ${family.length} family members and ${rows.length} daily records.`);
if (dryRun) {
  console.log("Dry run: first record ->", rows[0]);
  process.exit(0);
}

const url = process.env.TIGER_DATABASE_URL;
if (!url) {
  console.error("Missing TIGER_DATABASE_URL in .env.local. See docs/API-KEYS.md (Tiger Data section).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(await readFile(new URL("../db/tiger/schema.sql", import.meta.url), "utf8"));
  console.log("Schema ready (health_metrics hypertable + family_members).");

  for (const m of family) {
    await client.query(
      `INSERT INTO family_members (id, name, relationship, age, conditions, medications, city, state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, relationship=EXCLUDED.relationship, age=EXCLUDED.age,
         conditions=EXCLUDED.conditions, medications=EXCLUDED.medications, city=EXCLUDED.city, state=EXCLUDED.state`,
      [m.id, m.name, m.relationship, m.age, m.conditions, m.medications, m.location.city, m.location.state],
    );
  }

  // insert in batches of 500 rows
  const cols = 10;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const values = [];
    const params = batch.map((r, j) => {
      values.push(
        r.member, r.date, r.steps, r.restingHeartRate, r.sleepHours, r.activeEnergyKcal, r.exerciseMinutes,
        r.bloodPressure?.systolic ?? null, r.bloodPressure?.diastolic ?? null, r.bloodGlucose ?? null,
      );
      return `(${Array.from({ length: cols }, (_, k) => `$${j * cols + k + 1}`).join(",")})`;
    });
    await client.query(
      `INSERT INTO health_metrics (member_id, day, steps, resting_heart_rate, sleep_hours, active_energy_kcal,
         exercise_minutes, systolic, diastolic, blood_glucose)
       VALUES ${params.join(",")}
       ON CONFLICT (member_id, day) DO UPDATE SET steps=EXCLUDED.steps, resting_heart_rate=EXCLUDED.resting_heart_rate,
         sleep_hours=EXCLUDED.sleep_hours, active_energy_kcal=EXCLUDED.active_energy_kcal,
         exercise_minutes=EXCLUDED.exercise_minutes, systolic=EXCLUDED.systolic, diastolic=EXCLUDED.diastolic,
         blood_glucose=EXCLUDED.blood_glucose`,
      values,
    );
  }
  const { rows: check } = await client.query(
    "SELECT member_id, count(*)::int AS days FROM health_metrics GROUP BY member_id ORDER BY member_id",
  );
  console.log("Loaded into Tiger Data:", check.map((c) => `${c.member_id}=${c.days} days`).join(", "));
} finally {
  await client.end();
}
