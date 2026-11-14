-- Tiger Data (TimescaleDB) schema for iCare. Applied by `npm run seed:tiger`, one statement at a time.
-- Safe to re-run. Compression and refresh policies are added by the seed script (with version fallbacks).
--
-- What lives here (profiles and metrics side by side in ONE database):
--   family_members   relational profiles (conditions, medications, location)
--   health_metrics   hypertable: one row per person per day (sleep, blood pressure, glucose, daily totals)
--   vitals_minute    hypertable: one row per person per MINUTE (heart rate, steps): ~2.1M rows/year
--   vitals_hourly    continuous aggregate: hourly heart rate + steps (intraday charts)
--   vitals_daily     continuous aggregate: daily heart-rate stats + steps from the minute data
--   health_monthly   continuous aggregate: monthly averages (monthly/yearly reports)

CREATE TABLE IF NOT EXISTS family_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  relationship TEXT NOT NULL,
  age          INTEGER,
  conditions   TEXT[],
  medications  TEXT[],
  city         TEXT,
  state        TEXT
);

CREATE TABLE IF NOT EXISTS health_metrics (
  member_id          TEXT        NOT NULL,
  day                TIMESTAMPTZ NOT NULL,
  steps              INTEGER,
  resting_heart_rate INTEGER,
  sleep_hours        REAL,
  active_energy_kcal INTEGER,
  exercise_minutes   INTEGER,
  systolic           INTEGER,
  diastolic          INTEGER,
  blood_glucose      INTEGER,
  PRIMARY KEY (member_id, day)
);

SELECT create_hypertable('health_metrics', 'day', chunk_time_interval => INTERVAL '90 days', if_not_exists => TRUE, migrate_data => TRUE);

CREATE TABLE IF NOT EXISTS vitals_minute (
  member_id  TEXT        NOT NULL,
  ts         TIMESTAMPTZ NOT NULL,
  heart_rate SMALLINT    NOT NULL,
  steps      SMALLINT    NOT NULL,
  PRIMARY KEY (member_id, ts)
);

SELECT create_hypertable('vitals_minute', 'ts', chunk_time_interval => INTERVAL '7 days', if_not_exists => TRUE, migrate_data => TRUE);

CREATE MATERIALIZED VIEW IF NOT EXISTS vitals_hourly
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT member_id,
       time_bucket(INTERVAL '1 hour', ts) AS hour,
       avg(heart_rate)::real AS avg_hr,
       min(heart_rate)       AS min_hr,
       max(heart_rate)       AS max_hr,
       sum(steps)::int       AS steps
FROM vitals_minute
GROUP BY member_id, time_bucket(INTERVAL '1 hour', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS vitals_daily
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT member_id,
       time_bucket(INTERVAL '1 day', ts, 'Etc/GMT+5') AS day,
       avg(heart_rate)::real                AS avg_hr,
       min(heart_rate)                      AS min_hr,
       max(heart_rate)                      AS max_hr,
       sum(steps)::int                      AS steps,
       count(*) FILTER (WHERE steps > 60)   AS brisk_minutes,
       count(*) FILTER (WHERE heart_rate > 120) AS high_hr_minutes
FROM vitals_minute
GROUP BY member_id, time_bucket(INTERVAL '1 day', ts, 'Etc/GMT+5')
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS health_monthly
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT member_id,
       time_bucket(INTERVAL '1 month', day) AS month,
       count(*)                            AS days,
       avg(steps)::real                    AS avg_steps,
       avg(resting_heart_rate)::real       AS avg_rhr,
       avg(sleep_hours)::real              AS avg_sleep,
       sum(exercise_minutes)::int          AS total_exercise,
       avg(systolic)::real                 AS avg_sys,
       avg(diastolic)::real                AS avg_dia,
       avg(blood_glucose)::real            AS avg_glucose
FROM health_metrics
GROUP BY member_id, time_bucket(INTERVAL '1 month', day)
WITH NO DATA;
