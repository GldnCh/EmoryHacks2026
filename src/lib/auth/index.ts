// The one place features ask "who is using iCare, and what may they do?" (server-only).
//
//   const me = await currentAccount();                       // the owner of this iPhone (null until set up)
//   const ok = await authorize("appointments", "mia");       // throws AuthError (401/403) if not allowed
//   const people = await visiblePeople(me.id);               // everyone this account can see, with capabilities
//
// In API routes: wrap with `withAuthErrors` to turn AuthError into a proper JSON 401/403 response.
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { capabilitiesFor, LEVELS } from "./permissions";
import { OWNER_COOKIE, readOwnerToken } from "./session";
import { getAccount, getGrant, grantsForViewer, listAccounts } from "./store";
import type { Account, Capability, Level } from "./types";

export * from "./types";
export { LEVELS } from "./permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** Whose iPhone this is (the native app knows this from the device; the web demo asks once at /setup). */
export async function currentAccount(): Promise<Account | null> {
  const id = readOwnerToken((await cookies()).get(OWNER_COOKIE)?.value);
  return id ? getAccount(id) : null;
}

export async function requireAccount(): Promise<Account> {
  const me = await currentAccount();
  if (!me) throw new AuthError(401, "Set up this iPhone first.");
  return me;
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

/** The account that owns a health profile (the Riveras' account ids equal their member ids). */
export async function accountIdForMember(memberId: string): Promise<string> {
  return (await listAccounts()).find((a) => a.memberId === memberId)?.id ?? memberId;
}

/** authorize() for routes keyed by health-profile id (/api/trends/<memberId>, /api/vitals/<memberId>, ...). */
export async function authorizeMember(capability: Capability, memberId: string) {
  return authorize(capability, await accountIdForMember(memberId));
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
