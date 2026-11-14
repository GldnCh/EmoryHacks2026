// Family sharing: who can see whose health data, and how much.
//
// GET    /api/sharing[?subjectId=mia]   -> who can see this person (seenBy), whom they can see (canSee), levels
//                                          (subjectId defaults to you; for someone else you must be their guardian)
// POST   /api/sharing { subjectId?, viewerId, level, relationship?, guardian? }  -> change what a connected person
//                                          sees (new people: send a connection request; guardians may add directly)
// DELETE /api/sharing?subjectId=&viewerId=                                         -> stop sharing
//
// Rules: you control your own sharing; guardians (parents of a child, caregivers of an elderly parent) can manage
// it for them. A child can't remove or downgrade their guardians, and only an existing guardian can make someone
// else a guardian of a child.
import { NextResponse } from "next/server";
import { AuthError, capabilitiesOn, LEVELS, requireAccount, withAuthErrors } from "@/lib/auth";
import { isLevel } from "@/lib/auth/permissions";
import { deleteGrant, getAccount, getGrant, grantsForSubject, listAccounts, logActivity, upsertGrant } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

async function managedSubject(subjectId: string | null | undefined) {
  const actor = await requireAccount();
  const subject = subjectId ? await getAccount(subjectId) : actor;
  if (!subject) throw new AuthError(403, "You don't have access to that person.");
  const caps = await capabilitiesOn(actor.id, subject.id);
  if (!caps.includes("manageSharing")) throw new AuthError(403, `Only ${subject.displayName} or their guardian can change who sees their health.`);
  const isGuardian = actor.id !== subject.id; // managing someone else means you're their guardian
  return { actor, subject, isGuardian };
}

export const GET = withAuthErrors(async (req: Request) => {
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  const { actor, subject } = await managedSubject(subjectId);
  const [seenBy, all] = await Promise.all([grantsForSubject(subject.id), listAccounts()]);
  const name = (id: string) => all.find((a) => a.id === id)?.displayName ?? id;
  return NextResponse.json({
    subject,
    managedBy: actor.id,
    levels: LEVELS,
    seenBy: seenBy.map((g) => ({ ...g, viewerName: name(g.viewerId) })),
    // people who could be added (demo directory, minus the subject and anyone already added)
    canAdd: all.filter((a) => a.id !== subject.id && !seenBy.some((g) => g.viewerId === a.id)),
  });
});

export const POST = withAuthErrors(async (req: Request) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.viewerId !== "string" || !isLevel(body.level)) {
    return NextResponse.json({ error: "Send { viewerId, level: 'full' | 'summary' | 'basic' }." }, { status: 400 });
  }
  const { actor, subject, isGuardian } = await managedSubject(body.subjectId);
  const viewer = await getAccount(body.viewerId);
  if (!viewer || viewer.id === subject.id) return NextResponse.json({ error: "Pick someone else to share with." }, { status: 400 });

  const existing = await getGrant(subject.id, viewer.id);
  // New people come in through a connection request they accept. Only guardians may add someone directly
  // to the person they care for (e.g. a parent adding a grandparent to their child's sharing).
  if (!existing && !isGuardian) {
    return NextResponse.json({ error: `To share with ${viewer.displayName}, send them a connection request.` }, { status: 403 });
  }
  const wantGuardian = Boolean(body.guardian);
  // A child can't change or remove a guardian's access, or appoint new guardians.
  if (subject.kind === "child" && !isGuardian) {
    if (existing?.guardian) return NextResponse.json({ error: "Only a parent or guardian can change a guardian's access." }, { status: 403 });
    if (wantGuardian) return NextResponse.json({ error: "Only a parent or guardian can add a guardian." }, { status: 403 });
  }
  // Guardians must be able to see everything.
  const level = wantGuardian ? "full" : body.level;
  const relationship = typeof body.relationship === "string" ? body.relationship.slice(0, 40) : existing?.relationship ?? null;

  const grant = await upsertGrant({ subjectId: subject.id, viewerId: viewer.id, level, relationship, guardian: wantGuardian, grantedBy: actor.id });
  await logActivity(actor.id, subject.id, existing ? "sharing.change" : "sharing.grant", { viewerId: viewer.id, level, guardian: wantGuardian });
  return NextResponse.json({ ok: true, grant });
});

export const DELETE = withAuthErrors(async (req: Request) => {
  const sp = new URL(req.url).searchParams;
  const viewerId = sp.get("viewerId");
  if (!viewerId) return NextResponse.json({ error: "Pass ?viewerId=" }, { status: 400 });
  const { actor, subject, isGuardian } = await managedSubject(sp.get("subjectId"));
  const existing = await getGrant(subject.id, viewerId);
  if (!existing) return NextResponse.json({ error: "They don't have access." }, { status: 404 });
  if (existing.guardian && subject.kind === "child" && !isGuardian) {
    return NextResponse.json({ error: "Only a parent or guardian can remove a guardian." }, { status: 403 });
  }
  await deleteGrant(subject.id, viewerId);
  await logActivity(actor.id, subject.id, "sharing.revoke", { viewerId });
  return NextResponse.json({ ok: true });
});
