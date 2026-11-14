// The one place features ask "who is using iCare, and what may they do?" (server-only).
//
//   const me = await currentAccount();                       // null if nobody is signed in on this device
//   const ok = await authorize("appointments", "mia");       // throws AuthError (401/403) if not allowed
//   const people = await visiblePeople(me.id);               // everyone this account can see, with capabilities
//
// In API routes: wrap with `withAuthErrors` to turn AuthError into a proper JSON 401/403 response.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { capabilitiesFor, LEVELS } from "./permissions";
import { DEVICE_COOKIE, readDeviceAccounts, readSessionToken, SESSION_COOKIE } from "./session";
import { getAccount, getGrant, grantsForViewer, listAccounts } from "./store";
import type { Account, Capability, Level } from "./types";

export * from "./types";
export { LEVELS } from "./permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function currentAccount(): Promise<Account | null> {
  const jar = await cookies();
  const id = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  return id ? getAccount(id) : null;
}

export async function requireAccount(): Promise<Account> {
  const me = await currentAccount();
  if (!me) throw new AuthError(401, "Sign in to continue.");
  return me;
}

export async function deviceAccounts(): Promise<Account[]> {
  const jar = await cookies();
  const ids = readDeviceAccounts(jar.get(DEVICE_COOKIE)?.value);
  const all = await listAccounts();
  return ids.map((id) => all.find((a) => a.id === id)).filter((a): a is Account => Boolean(a));
}

export interface VisiblePerson {
  account: Account;
  self: boolean;
  level: Level | "self";
  levelLabel: string;
  relationship: string | null;
  guardian: boolean;
  capabilities: Capability[];
}

/** Everyone this account can see (themselves first), with what they may do. */
export async function visiblePeople(viewerId: string): Promise<VisiblePerson[]> {
  const [me, grants, all] = await Promise.all([getAccount(viewerId), grantsForViewer(viewerId), listAccounts()]);
  const people: VisiblePerson[] = [];
  if (me) people.push({ account: me, self: true, level: "self", levelLabel: "You", relationship: null, guardian: false, capabilities: capabilitiesFor(me.id, me.id) });
  const order = { full: 0, summary: 1, basic: 2 };
  for (const g of [...grants].sort((a, b) => order[a.level] - order[b.level])) {
    const acc = all.find((a) => a.id === g.subjectId);
    if (!acc) continue;
    people.push({
      account: acc, self: false, level: g.level, levelLabel: LEVELS[g.level].label, relationship: g.relationship,
      guardian: g.guardian, capabilities: capabilitiesFor(viewerId, g.subjectId, g),
    });
  }
  return people;
}

/** What `viewerId` may do with `subjectId`'s data. */
export async function capabilitiesOn(viewerId: string, subjectId: string): Promise<Capability[]> {
  if (viewerId === subjectId) return capabilitiesFor(viewerId, subjectId);
  return capabilitiesFor(viewerId, subjectId, await getGrant(subjectId, viewerId));
}

/** Throws AuthError unless the signed-in account has `capability` on `subjectId` (an account id). */
export async function authorize(capability: Capability, subjectId: string): Promise<{ actor: Account; subject: Account }> {
  const actor = await requireAccount();
  const subject = await getAccount(subjectId);
  if (!subject) throw new AuthError(403, "You don't have access to that person.");
  const caps = await capabilitiesOn(actor.id, subject.id);
  if (!caps.includes(capability)) throw new AuthError(403, `You don't have permission to see or change ${subject.displayName}'s ${capability}.`);
  return { actor, subject };
}

/** Wrap a route handler so AuthError becomes a JSON 401/403 instead of a crash. */
export function withAuthErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }
  };
}
