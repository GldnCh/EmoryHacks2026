// Loads the Rivera family into Tiger Data (TimescaleDB) and shows off what it's good at.
//
//   npm run seed:tiger                    full load: profiles, daily metrics, ~2.1M minute readings,
//                                         continuous aggregates, compression, benchmark (~3-5 min)
//   npm run seed:tiger -- --dry-run       show what would be loaded (no database needed)
//   npm run seed:tiger -- --skip-minute   profiles + daily metrics only (fast)
//   npm run seed:tiger -- --reset         wipe the minute data first, then load everything again
//
// Needs TIGER_DATABASE_URL in .env.local (see docs/API-KEYS.md). Safe to re-run.
import { readFile } from "node:fs/promises";
import pg from "pg";
// Node 22.18+ runs TypeScript directly, so we reuse the exact same generator as the app.
import { getFamily, getDailyMetrics, getMinuteVitals, SAMPLE_START, SAMPLE_END } from "../src/lib/sample-data/health.ts";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipMinute = args.has("--skip-minute");
const reset = args.has("--reset");

const family = getFamily();
const days = getDailyMetrics(family[0].id).map((d) => d.date);
const MINUTES_PER_MEMBER = days.length * 1440;
const tz = "-05:00"; // demo data uses Eastern time without DST shifts
const pad = (n) => String(n).padStart(2, "0");
const tsFor = (date, minute) => `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00${tz}`;
const mb = (bytes) => `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB`;

console.log(
  `Prepared ${family.length} family members, ${family.length * days.length} daily records, ` +
    `${(family.length * MINUTES_PER_MEMBER).toLocaleString()} minute readings (${SAMPLE_START} to ${SAMPLE_END}).`,
);
if (dryRun) {
  console.log("Dry run. Example minute reading:", { member: family[0].id, ts: tsFor(days[200], 1110), ...getMinuteVitals(family[0].id, days[200])[1110] });
  process.exit(0);
}

const url = process.env.TIGER_DATABASE_URL;
if (!url) {
  console.error("Missing TIGER_DATABASE_URL in .env.local. See docs/API-KEYS.md (Tiger Data section).");
  process.exit(1);
}

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = (sql, params) => db.query(sql, params);
/** Try each SQL variant in order (TimescaleDB renamed some APIs between versions). */
async function tryEach(label, variants) {
  for (const sql of variants) {
    try {
      await q(sql);
      return true;
    } catch (err) {
      if (sql === variants.at(-1)) console.warn(`  ! ${label}: ${err.message.split("\n")[0]}`);
    }
  }
  return false;
}
async function timed(sql, params) {
  const t = performance.now();
  const res = await q(sql, params);
  return { rows: res.rows, ms: Math.round((performance.now() - t) * 10) / 10 };
}

try {
  // 1. schema, one statement at a time
  const schema = (await readFile(new URL("../db/tiger/schema.sql", import.meta.url), "utf8"))
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of schema) await q(stmt);
  console.log("✓ Schema ready: family_members, health_metrics + vitals_minute hypertables, 3 continuous aggregates.");

  // 2. profiles (relational) + daily metrics
  for (const m of family) {
    await q(
      `INSERT INTO family_members (id, name, relationship, age, conditions, medications, city, state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, relationship=EXCLUDED.relationship, age=EXCLUDED.age,
         conditions=EXCLUDED.conditions, medications=EXCLUDED.medications, city=EXCLUDED.city, state=EXCLUDED.state`,
      [m.id, m.name, m.relationship, m.age, m.conditions, m.medications, m.location.city, m.location.state],
    );
    const d = getDailyMetrics(m.id);
    await q(
      `INSERT INTO health_metrics (member_id, day, steps, resting_heart_rate, sleep_hours, active_energy_kcal,
         exercise_minutes, systolic, diastolic, blood_glucose)
       SELECT $1, * FROM unnest($2::timestamptz[], $3::int[], $4::int[], $5::real[], $6::int[], $7::int[], $8::int[], $9::int[], $10::int[])
       ON CONFLICT (member_id, day) DO UPDATE SET steps=EXCLUDED.steps, resting_heart_rate=EXCLUDED.resting_heart_rate,
         sleep_hours=EXCLUDED.sleep_hours, active_energy_kcal=EXCLUDED.active_energy_kcal, exercise_minutes=EXCLUDED.exercise_minutes,
         systolic=EXCLUDED.systolic, diastolic=EXCLUDED.diastolic, blood_glucose=EXCLUDED.blood_glucose`,
      [
        m.id,
        d.map((x) => `${x.date}T00:00:00${tz}`),
        d.map((x) => x.steps),
        d.map((x) => x.restingHeartRate),
        d.map((x) => x.sleepHours),
        d.map((x) => x.activeEnergyKcal),
        d.map((x) => x.exerciseMinutes),
        d.map((x) => x.bloodPressure?.systolic ?? null),
        d.map((x) => x.bloodPressure?.diastolic ?? null),
        d.map((x) => x.bloodGlucose ?? null),
      ],
    );
  }
  console.log(`✓ ${family.length} profiles and ${family.length * days.length} daily records loaded.`);

  // 3. minute-level vitals (~2.1M rows), 7 days per batch via unnest()
  if (!skipMinute) {
    if (reset) {
      await q("TRUNCATE vitals_minute");
      console.log("  (reset: minute data cleared)");
    }
    for (const m of family) {
      const { rows } = await q("SELECT count(*)::int AS n FROM vitals_minute WHERE member_id = $1", [m.id]);
      if (rows[0].n >= MINUTES_PER_MEMBER) {
        console.log(`  ${m.id}: already loaded (${rows[0].n.toLocaleString()} readings), skipping`);
        continue;
      }
      if (rows[0].n > 0) {
        console.error(`  ${m.id} is partly loaded (${rows[0].n}). Re-run with --reset to reload cleanly.`);
        process.exit(1);
      }
      const t = performance.now();
      for (let i = 0; i < days.length; i += 7) {
        const ts = [], hr = [], st = [];
        for (const date of days.slice(i, i + 7)) {
          for (const v of getMinuteVitals(m.id, date)) {
            ts.push(tsFor(date, v.minute));
            hr.push(v.heartRate);
            st.push(v.steps);
          }
        }
        await q(
          `INSERT INTO vitals_minute (member_id, ts, heart_rate, steps)
           SELECT $1, * FROM unnest($2::timestamptz[], $3::smallint[], $4::smallint[])
           ON CONFLICT DO NOTHING`,
          [m.id, ts, hr, st],
        );
        process.stdout.write(`\r  ${m.id}: ${Math.min(i + 7, days.length)}/${days.length} days`);
      }
      console.log(`\r  ${m.id}: ${MINUTES_PER_MEMBER.toLocaleString()} minute readings in ${((performance.now() - t) / 1000).toFixed(0)}s`);
    }
  }

  // 4. continuous aggregates: materialize now + keep them fresh automatically
  for (const view of ["vitals_hourly", "vitals_daily", "health_monthly"]) {
    await q(`CALL refresh_continuous_aggregate('${view}', NULL, NULL)`);
  }
  await tryEach("vitals_hourly policy", [
    `SELECT add_continuous_aggregate_policy('vitals_hourly', start_offset => INTERVAL '3 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '30 minutes', if_not_exists => TRUE)`,
  ]);
  await tryEach("vitals_daily policy", [
    `SELECT add_continuous_aggregate_policy('vitals_daily', start_offset => INTERVAL '7 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE)`,
  ]);
  await tryEach("health_monthly policy", [
    `SELECT add_continuous_aggregate_policy('health_monthly', start_offset => INTERVAL '3 months', end_offset => INTERVAL '1 day', schedule_interval => INTERVAL '1 day', if_not_exists => TRUE)`,
  ]);
  console.log("✓ Continuous aggregates refreshed (hourly, daily, monthly) with auto-refresh policies.");

  // 5. compression (columnstore): segment by person, newest first
  if (!skipMinute) {
    const before = (await q("SELECT hypertable_size('vitals_minute') AS b")).rows[0].b;
    const enabled = await tryEach("enable compression", [
      `ALTER TABLE vitals_minute SET (timescaledb.enable_columnstore = true, timescaledb.segmentby = 'member_id', timescaledb.orderby = 'ts DESC')`,
      `ALTER TABLE vitals_minute SET (timescaledb.compress, timescaledb.compress_segmentby = 'member_id', timescaledb.compress_orderby = 'ts DESC')`,
    ]);
    if (enabled) {
      await tryEach("compression policy", [
        `CALL add_columnstore_policy('vitals_minute', after => INTERVAL '7 days', if_not_exists => true)`,
        `SELECT add_compression_policy('vitals_minute', INTERVAL '7 days', if_not_exists => true)`,
      ]);
      await tryEach("compress existing chunks", [
        `SELECT compress_chunk(c, if_not_compressed => true) FROM show_chunks('vitals_minute', older_than => INTERVAL '7 days') c`,
      ]);
      const after = (await q("SELECT hypertable_size('vitals_minute') AS b")).rows[0].b;
      const saved = Number(before) > 0 ? Math.round((1 - Number(after) / Number(before)) * 100) : 0;
      console.log(`✓ Compression on: vitals_minute ${mb(before)} → ${mb(after)} (${saved}% smaller).`);
    }
  }

  // 6. benchmark: raw minute data vs continuous aggregate
  const raw = await timed(
    `SELECT time_bucket(INTERVAL '1 day', ts) AS d, avg(heart_rate), sum(steps)
       FROM vitals_minute WHERE member_id = 'jordan' GROUP BY d`,
  );
  const cagg = await timed(`SELECT day, avg_hr, steps FROM vitals_daily WHERE member_id = 'jordan'`);
  console.log(`✓ Benchmark (Jordan's daily heart rate + steps for a year): raw minutes ${raw.ms} ms vs continuous aggregate ${cagg.ms} ms.`);

  const { rows: check } = await q(
    `SELECT f.id, (SELECT count(*) FROM health_metrics h WHERE h.member_id = f.id)::int AS days,
            (SELECT count(*) FROM vitals_minute v WHERE v.member_id = f.id)::int AS minutes
       FROM family_members f ORDER BY f.id`,
  );
  console.log("Loaded into Tiger Data:", check.map((c) => `${c.id}=${c.days} days/${c.minutes.toLocaleString()} minutes`).join(", "));
} finally {
  await db.end();
}
