// Accounts, sharing grants and the activity log. Stored in Tiger Data (tables in db/tiger/app-schema.sql);
// falls back to an in-memory copy of the demo data when TIGER_DATABASE_URL isn't set (local dev without keys).
import { tigerConfigured, tigerQuery } from "@/lib/tiger";
import { SEED_ACCOUNTS, SEED_SHARING } from "./seed";
import type { Account, Level, SharingGrant } from "./types";

// ---------- in-memory fallback ----------
const mem = {
  accounts: SEED_ACCOUNTS.map((a) => ({ ...a })),
  sharing: SEED_SHARING.map((s) => ({ ...s })) as SharingGrant[],
  log: [] as { at: string; actorId: string; subjectId: string; action: string; detail?: unknown }[],
};

type AccountRow = { id: string; display_name: string; kind: Account["kind"]; member_id: string | null };
type GrantRow = {
  subject_id: string; viewer_id: string; level: Level; relationship: string | null; guardian: boolean;
  granted_by: string; created_at: Date; updated_at: Date;
};
const toAccount = (r: AccountRow): Account => ({ id: r.id, displayName: r.display_name, kind: r.kind, memberId: r.member_id });
const toGrant = (r: GrantRow): SharingGrant => ({
  subjectId: r.subject_id, viewerId: r.viewer_id, level: r.level, relationship: r.relationship, guardian: r.guardian,
  grantedBy: r.granted_by, createdAt: r.created_at?.toISOString?.(), updatedAt: r.updated_at?.toISOString?.(),
});

// If the database is configured but the app tables haven't been created yet, fall back instead of failing.
let dbReady: boolean | null = null;
async function dbAvailable(): Promise<boolean> {
  if (!tigerConfigured()) return false;
  if (dbReady !== null) return dbReady;
  try {
    await tigerQuery("SELECT 1 FROM accounts LIMIT 1");
    dbReady = true;
  } catch {
    console.warn("[auth] accounts table not found in Tiger Data; using in-memory demo accounts. Run `npm run seed:app`.");
    dbReady = false;
  }
  return dbReady;
}

export async function storeInfo() {
  return { source: (await dbAvailable()) ? "Tiger Data" : "in-memory demo" };
}

export async function listAccounts(): Promise<Account[]> {
  if (!(await dbAvailable())) return mem.accounts;
  return (await tigerQuery<AccountRow>("SELECT id, display_name, kind, member_id FROM accounts ORDER BY created_at, id")).map(toAccount);
}

export async function getAccount(id: string): Promise<Account | null> {
  if (!(await dbAvailable())) return mem.accounts.find((a) => a.id === id) ?? null;
  const rows = await tigerQuery<AccountRow>("SELECT id, display_name, kind, member_id FROM accounts WHERE id = $1", [id]);
  return rows[0] ? toAccount(rows[0]) : null;
}

/** Grants where this account is the viewer: whose data they can see. */
export async function grantsForViewer(viewerId: string): Promise<SharingGrant[]> {
  if (!(await dbAvailable())) return mem.sharing.filter((g) => g.viewerId === viewerId);
  return (await tigerQuery<GrantRow>("SELECT * FROM sharing WHERE viewer_id = $1", [viewerId])).map(toGrant);
}

/** Grants where this account is the subject: who can see their data. */
export async function grantsForSubject(subjectId: string): Promise<SharingGrant[]> {
  if (!(await dbAvailable())) return mem.sharing.filter((g) => g.subjectId === subjectId);
  return (await tigerQuery<GrantRow>("SELECT * FROM sharing WHERE subject_id = $1", [subjectId])).map(toGrant);
}

export async function getGrant(subjectId: string, viewerId: string): Promise<SharingGrant | null> {
  if (!(await dbAvailable())) return mem.sharing.find((g) => g.subjectId === subjectId && g.viewerId === viewerId) ?? null;
  const rows = await tigerQuery<GrantRow>("SELECT * FROM sharing WHERE subject_id = $1 AND viewer_id = $2", [subjectId, viewerId]);
  return rows[0] ? toGrant(rows[0]) : null;
}

export async function upsertGrant(g: Omit<SharingGrant, "createdAt" | "updatedAt">): Promise<SharingGrant> {
  if (!(await dbAvailable())) {
    const i = mem.sharing.findIndex((x) => x.subjectId === g.subjectId && x.viewerId === g.viewerId);
    if (i >= 0) mem.sharing[i] = { ...g };
    else mem.sharing.push({ ...g });
    return g;
  }
  const rows = await tigerQuery<GrantRow>(
    `INSERT INTO sharing (subject_id, viewer_id, level, relationship, guardian, granted_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (subject_id, viewer_id) DO UPDATE SET level = EXCLUDED.level, relationship = EXCLUDED.relationship,
       guardian = EXCLUDED.guardian, granted_by = EXCLUDED.granted_by, updated_at = now()
     RETURNING *`,
    [g.subjectId, g.viewerId, g.level, g.relationship, g.guardian, g.grantedBy],
  );
  return toGrant(rows[0]);
}

export async function deleteGrant(subjectId: string, viewerId: string): Promise<boolean> {
  if (!(await dbAvailable())) {
    const before = mem.sharing.length;
    mem.sharing = mem.sharing.filter((g) => !(g.subjectId === subjectId && g.viewerId === viewerId));
    return mem.sharing.length < before;
  }
  const rows = await tigerQuery("DELETE FROM sharing WHERE subject_id = $1 AND viewer_id = $2 RETURNING 1", [subjectId, viewerId]);
  return rows.length > 0;
}

/** Audit trail: who did what on whose account (best effort; never blocks the action). */
export async function logActivity(actorId: string, subjectId: string, action: string, detail?: unknown) {
  try {
    if (!(await dbAvailable())) {
      mem.log.unshift({ at: new Date().toISOString(), actorId, subjectId, action, detail });
      mem.log.length = Math.min(mem.log.length, 200);
      return;
    }
    await tigerQuery("INSERT INTO activity_log (actor_id, subject_id, action, detail) VALUES ($1,$2,$3,$4)", [
      actorId, subjectId, action, detail === undefined ? null : JSON.stringify(detail),
    ]);
  } catch (err) {
    console.error("[auth] activity log failed", err);
  }
}

export async function recentActivity(subjectId: string, limit = 20) {
  if (!(await dbAvailable())) return mem.log.filter((l) => l.subjectId === subjectId).slice(0, limit);
  return tigerQuery<{ at: Date; actor_id: string; subject_id: string; action: string; detail: unknown }>(
    "SELECT at, actor_id, subject_id, action, detail FROM activity_log WHERE subject_id = $1 ORDER BY at DESC LIMIT $2",
    [subjectId, limit],
  );
}
