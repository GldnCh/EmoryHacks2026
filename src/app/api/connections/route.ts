// Connecting your iCare with someone else's: request → accept, and either side can disconnect.
//
// GET    /api/connections                       -> your connections (what each side sees), incoming + outgoing requests
// POST   /api/connections { toId, level, relationship? }
//                                                -> send a request. `level` = what THEY will see of YOU.
// DELETE /api/connections?with=<accountId>      -> disconnect from both sides (removes sharing in both directions).
//                                                   A child can't disconnect a guardian.
// Accept / decline / cancel a request: POST /api/connections/<requestId> { action }.
import { NextResponse } from "next/server";
import { LEVELS, requireAccount, withAuthErrors } from "@/lib/auth";
import { isLevel } from "@/lib/auth/permissions";
import {
  createRequest, deleteGrant, getAccount, getGrant, grantsForSubject, grantsForViewer, listAccounts, logActivity, pendingRequestsFor,
} from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export const GET = withAuthErrors(async () => {
  const me = await requireAccount();
  const [all, iSee, seeMe, pending] = await Promise.all([listAccounts(), grantsForViewer(me.id), grantsForSubject(me.id), pendingRequestsFor(me.id)]);
  const byId = (id: string) => all.find((a) => a.id === id) ?? null;
  const ids = [...new Set([...iSee.map((g) => g.subjectId), ...seeMe.map((g) => g.viewerId)])];
  const connected = ids.map((id) => {
    const mine = seeMe.find((g) => g.viewerId === id) ?? null; // what THEY see of ME
    const theirs = iSee.find((g) => g.subjectId === id) ?? null; // what I see of THEM
    return {
      account: byId(id),
      theySee: mine ? { level: mine.level, label: LEVELS[mine.level].label, guardian: mine.guardian } : null,
      iSee: theirs ? { level: theirs.level, label: LEVELS[theirs.level].label, guardian: theirs.guardian } : null,
      relationship: theirs?.relationship ?? null, // how I relate to them (e.g. "son")
      // a child can't disconnect from a guardian
      canDisconnect: !(me.kind === "child" && mine?.guardian),
    };
  });
  const pendingIds = new Set(pending.map((r) => (r.fromId === me.id ? r.toId : r.fromId)));
  return NextResponse.json({
    me,
    levels: LEVELS,
    connected,
    incoming: pending.filter((r) => r.toId === me.id).map((r) => ({ ...r, from: byId(r.fromId), fromLevelLabel: LEVELS[r.fromLevel].label })),
    outgoing: pending.filter((r) => r.fromId === me.id).map((r) => ({ ...r, to: byId(r.toId), fromLevelLabel: LEVELS[r.fromLevel].label })),
    canConnect: all.filter((a) => a.id !== me.id && !ids.includes(a.id) && !pendingIds.has(a.id)),
  });
});

export const POST = withAuthErrors(async (req: Request) => {
  const me = await requireAccount();
  const body = await req.json().catch(() => null);
  if (!body || typeof body.toId !== "string" || !isLevel(body.level)) {
    return NextResponse.json({ error: "Send { toId, level: 'full' | 'summary' | 'basic' }." }, { status: 400 });
  }
  const to = await getAccount(body.toId);
  if (!to || to.id === me.id) return NextResponse.json({ error: "Pick someone else to connect with." }, { status: 400 });
  if ((await getGrant(me.id, to.id)) || (await getGrant(to.id, me.id))) {
    return NextResponse.json({ error: `You're already connected with ${to.displayName}. Change what they see instead.` }, { status: 409 });
  }
  if ((await pendingRequestsFor(me.id)).some((r) => (r.fromId === me.id && r.toId === to.id) || (r.fromId === to.id && r.toId === me.id))) {
    return NextResponse.json({ error: `There's already a pending request between you and ${to.displayName}.` }, { status: 409 });
  }
  const relationship = typeof body.relationship === "string" && body.relationship.trim() ? body.relationship.trim().slice(0, 40).toLowerCase() : null;
  const request = await createRequest(me.id, to.id, body.level, relationship);
  await logActivity(me.id, to.id, "connection.request", { requestId: request.id, level: body.level });
  return NextResponse.json({ ok: true, request });
});

export const DELETE = withAuthErrors(async (req: Request) => {
  const me = await requireAccount();
  const otherId = new URL(req.url).searchParams.get("with");
  const other = otherId ? await getAccount(otherId) : null;
  if (!other) return NextResponse.json({ error: "Pass ?with=<accountId>." }, { status: 400 });
  const theySeeMe = await getGrant(me.id, other.id);
  const iSeeThem = await getGrant(other.id, me.id);
  if (!theySeeMe && !iSeeThem) return NextResponse.json({ error: "You're not connected." }, { status: 404 });
  if (me.kind === "child" && theySeeMe?.guardian) {
    return NextResponse.json({ error: `${other.displayName} is your guardian. Only a guardian can end that connection.` }, { status: 403 });
  }
  if (theySeeMe) await deleteGrant(me.id, other.id);
  if (iSeeThem) await deleteGrant(other.id, me.id);
  await logActivity(me.id, me.id, "connection.disconnect", { with: other.id });
  await logActivity(me.id, other.id, "connection.disconnect", { with: me.id });
  return NextResponse.json({ ok: true });
});
