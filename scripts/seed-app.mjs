// Creates iCare's account + family-sharing tables in Tiger Data and loads the demo accounts.
//   npm run seed:app             create tables (if missing), add demo accounts and default sharing
//   npm run seed:app -- --reset  also restore the default sharing (removes changes people made in the app)
// Needs the ADMIN TIGER_DATABASE_URL (Cam). Safe to re-run. Also lets the read-only teammate login (idoc_team)
// read and write these app tables (but still not the health-data tables or the schema).
import { readFile } from "node:fs/promises";
import pg from "pg";
import { tigerConnectionConfig } from "../src/lib/tiger-ca.ts";
import { SEED_ACCOUNTS, SEED_REQUESTS, SEED_SHARING } from "../src/lib/auth/seed.ts";

const reset = process.argv.includes("--reset");
if (!process.env.TIGER_DATABASE_URL) {
  console.error("Missing TIGER_DATABASE_URL in .env.local.");
  process.exit(1);
}
const db = new pg.Client(tigerConnectionConfig(process.env.TIGER_DATABASE_URL));
await db.connect();
try {
  const sql = (await readFile(new URL("../db/tiger/app-schema.sql", import.meta.url), "utf8"))
    .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")
    .split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const stmt of sql) await db.query(stmt);
  console.log("✓ Tables ready: accounts, sharing, activity_log, connection_requests");

  for (const a of SEED_ACCOUNTS) {
    await db.query(
      `INSERT INTO accounts (id, display_name, kind, member_id) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, kind = EXCLUDED.kind, member_id = EXCLUDED.member_id`,
      [a.id, a.displayName, a.kind, a.memberId],
    );
  }
  console.log(`✓ ${SEED_ACCOUNTS.length} demo accounts: ${SEED_ACCOUNTS.map((a) => a.id).join(", ")}`);

  if (reset) {
    await db.query("DELETE FROM sharing");
    await db.query("DELETE FROM connection_requests");
    console.log("  (reset: sharing cleared)");
  }
  let added = 0;
  for (const g of SEED_SHARING) {
    const r = await db.query(
      `INSERT INTO sharing (subject_id, viewer_id, level, relationship, guardian, granted_by)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (subject_id, viewer_id) DO NOTHING`,
      [g.subjectId, g.viewerId, g.level, g.relationship, g.guardian, g.grantedBy],
    );
    added += r.rowCount;
  }
  console.log(`✓ Default family sharing: ${added} added (${SEED_SHARING.length - added} already present)`);

  // Demo connection requests (only if those two aren't already connected or waiting)
  for (const r of SEED_REQUESTS) {
    const { rowCount: busy } = await db.query(
      `SELECT 1 FROM sharing WHERE (subject_id = $1 AND viewer_id = $2) OR (subject_id = $2 AND viewer_id = $1)
       UNION SELECT 1 FROM connection_requests WHERE status = 'pending' AND from_id = $1 AND to_id = $2`,
      [r.fromId, r.toId],
    );
    if (!busy) {
      await db.query("INSERT INTO connection_requests (from_id, to_id, from_level, relationship) VALUES ($1,$2,$3,$4)", [r.fromId, r.toId, r.fromLevel, r.relationship]);
      console.log(`✓ Demo request: ${r.fromId} → ${r.toId}`);
    }
  }

  // Teammates' read-only login may use the app tables (not the health data or the schema).
  const { rowCount } = await db.query("SELECT 1 FROM pg_roles WHERE rolname = 'idoc_team'");
  if (rowCount) {
    await db.query("GRANT SELECT, INSERT, UPDATE, DELETE ON accounts, sharing, activity_log, connection_requests TO idoc_team");
    await db.query("GRANT USAGE, SELECT ON SEQUENCE activity_log_id_seq, connection_requests_id_seq TO idoc_team");
    console.log("✓ idoc_team can read/write the app tables (health data stays read-only)");
  }

  const { rows } = await db.query(
    "SELECT viewer_id, subject_id, level, guardian FROM sharing ORDER BY viewer_id, subject_id",
  );
  console.log("Sharing now:", rows.map((r) => `${r.viewer_id}→${r.subject_id}:${r.level}${r.guardian ? "(guardian)" : ""}`).join("  "));
} finally {
  await db.end();
}
