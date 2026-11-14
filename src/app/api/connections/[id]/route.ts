// Respond to a connection request.
//   POST /api/connections/<id> { action: "accept", level?: "full" | "summary" | "basic" | null, relationship? }
//        -> recipient accepts: they now see the sender at the level the sender offered, and the sender sees
//           them at `level` (null = share nothing back).
//   POST /api/connections/<id> { action: "decline" }   -> recipient declines
//   POST /api/connections/<id> { action: "cancel" }    -> sender withdraws a pending request
import { NextResponse } from "next/server";
import { AuthError, requireAccount, withAuthErrors } from "@/lib/auth";
import { inverseRelationship, isLevel } from "@/lib/auth/permissions";
import { getRequest, logActivity, setRequestStatus, upsertGrant } from "@/lib/auth/store";

export const POST = withAuthErrors(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const me = await requireAccount();
  const id = Number((await ctx.params).id);
  const request = Number.isInteger(id) ? await getRequest(id) : null;
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: `This request was already ${request.status}.` }, { status: 409 });

  const body = await req.json().catch(() => null);
  const action = body?.action;

  if (action === "cancel") {
    if (request.fromId !== me.id) throw new AuthError(403, "Only the sender can cancel a request.");
    await setRequestStatus(id, "cancelled");
    await logActivity(me.id, request.toId, "connection.cancel", { requestId: id });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (request.toId !== me.id) throw new AuthError(403, "Only the person who received this request can answer it.");

  if (action === "decline") {
    await setRequestStatus(id, "declined");
    await logActivity(me.id, request.fromId, "connection.decline", { requestId: id });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  if (action === "accept") {
    const backLevel = body?.level == null ? null : body.level;
    if (backLevel !== null && !isLevel(backLevel)) return NextResponse.json({ error: "level must be full, summary, basic or null." }, { status: 400 });
    // I (recipient) can now see the sender at the level they offered.
    await upsertGrant({ subjectId: request.fromId, viewerId: me.id, level: request.fromLevel, relationship: request.relationship, guardian: false, grantedBy: request.fromId });
    // Optionally, the sender can see me at the level I choose.
    if (backLevel) {
      const rel = typeof body?.relationship === "string" && body.relationship.trim() ? body.relationship.trim().slice(0, 40).toLowerCase() : inverseRelationship(request.relationship);
      await upsertGrant({ subjectId: me.id, viewerId: request.fromId, level: backLevel, relationship: rel, guardian: false, grantedBy: me.id });
    }
    await setRequestStatus(id, "accepted");
    await logActivity(me.id, request.fromId, "connection.accept", { requestId: id, sharedBack: backLevel });
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  return NextResponse.json({ error: "action must be accept, decline or cancel." }, { status: 400 });
});
