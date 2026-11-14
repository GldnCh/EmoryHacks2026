-- Tiger Data (TimescaleDB) schema for IDoc's health history.
-- Applied automatically by `npm run seed:tiger`. Safe to re-run.

-- One row per family member per day (Apple Health-style metrics).
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

-- Turn it into a hypertable: TimescaleDB partitions it by time so trend queries stay fast.
SELECT create_hypertable('health_metrics', 'day', if_not_exists => TRUE, migrate_data => TRUE);

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
