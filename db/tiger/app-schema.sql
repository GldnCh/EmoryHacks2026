-- iCare accounts, family sharing and activity log (Tiger Data / PostgreSQL).
-- Applied by `npm run seed:app` (one statement at a time). Safe to re-run.
--
-- accounts      one per person ("Apple ID" for now: demo sign-in; apple_sub is reserved for real Sign in with Apple)
-- sharing       who can see whose health data, and how much (full / summary / basic). The SUBJECT (or their
--               guardian, for kids and elderly parents) controls it.
-- activity_log  who did what on whose account, and from which signed-in account (e.g. Mia using Mom's phone)

CREATE TABLE IF NOT EXISTS accounts (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'adult' CHECK (kind IN ('adult', 'child', 'elder')),
  member_id    TEXT,          -- links to family_members / health data; NULL = no health data connected yet
  apple_sub    TEXT UNIQUE,   -- reserved for real Sign in with Apple (the stable Apple user id)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sharing (
  subject_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- whose health data
  viewer_id    TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- who can see it
  level        TEXT NOT NULL CHECK (level IN ('full', 'summary', 'basic')),
  relationship TEXT,                                                    -- how the viewer relates to the subject
  guardian     BOOLEAN NOT NULL DEFAULT false,                          -- may manage the subject's sharing and act for them
  granted_by   TEXT NOT NULL REFERENCES accounts(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, viewer_id),
  CHECK (subject_id <> viewer_id)
);

CREATE INDEX IF NOT EXISTS sharing_viewer_idx ON sharing (viewer_id);

CREATE TABLE IF NOT EXISTS activity_log (
  id         BIGSERIAL PRIMARY KEY,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id   TEXT NOT NULL,   -- the signed-in account that did it
  subject_id TEXT NOT NULL,   -- whose account it affected
  action     TEXT NOT NULL,   -- e.g. 'signin', 'sharing.grant', 'appointment.create'
  detail     JSONB
);

CREATE INDEX IF NOT EXISTS activity_subject_idx ON activity_log (subject_id, at DESC);

-- Connection requests: sharing starts with a request that the other person accepts (like a friend request).
-- from_level = what the recipient will see of the sender. On accept the recipient picks what the sender sees of
-- them (or nothing), and the matching rows are created in `sharing`. Either side can disconnect later.
CREATE TABLE IF NOT EXISTS connection_requests (
  id           BIGSERIAL PRIMARY KEY,
  from_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_id        TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_level   TEXT NOT NULL CHECK (from_level IN ('full', 'summary', 'basic')),
  relationship TEXT,          -- how the recipient relates to the sender, e.g. "spouse", "friend"
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (from_id <> to_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS connection_requests_one_pending ON connection_requests (from_id, to_id) WHERE status = 'pending';

-- Medication reminders: one row per medicine schedule, copied from the prescription label by the person or a
-- guardian (times are local, e.g. {08:00,20:00}). demo = seeded for the fictional family (history before today
-- is generated relative to today; see src/lib/reminders/seed.ts). Removing a reminder sets active = false.
CREATE TABLE IF NOT EXISTS med_schedules (
  id          SERIAL PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  medicine    TEXT NOT NULL,
  label       TEXT NOT NULL,
  times       TEXT[] NOT NULL,
  timezone    TEXT NOT NULL DEFAULT 'America/New_York',
  demo        BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS med_schedules_account_idx ON med_schedules (account_id) WHERE active;

-- Dose log: what someone tapped ("taken" or "skipped") for one scheduled dose.
CREATE TABLE IF NOT EXISTS dose_log (
  id            BIGSERIAL PRIMARY KEY,
  schedule_id   INT NOT NULL REFERENCES med_schedules(id) ON DELETE CASCADE,
  account_id    TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('taken', 'skipped')),
  logged_by     TEXT NOT NULL,
  logged_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, scheduled_for)
);
