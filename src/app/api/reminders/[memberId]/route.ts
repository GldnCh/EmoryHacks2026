// Medication reminders and dose tracking for one person. Owner: Cam.
//
// GET  /api/reminders/<memberId>?days=7   -> schedules, every dose in the window (oldest first), adherence, canAct
//      needs "reminders" (that person, or a Full connection)
// POST /api/reminders/<memberId>          needs "act" (that person, or their guardian)
//      { action: "log", scheduleId, scheduledFor, status: "taken" | "skipped" }  record a dose (today, or up to 2 days back)
//      { action: "add", medicine, times: ["08:00", ...], label? }                 add a schedule from the prescription label
//      { action: "remove", scheduleId }                                           stop a schedule (history is kept)
// iCare records what the label says and what was taken. It never suggests doses or changes.
import { NextResponse } from "next/server";
import { authorizeMember, capabilitiesOn, withAuthErrors } from "@/lib/auth";
import { logActivity } from "@/lib/auth/store";
import { getMember } from "@/lib/sample-data/health";
import { addSchedule, adherence, dosesFor, listSchedules, removeSchedule, saveDoseLog } from "@/lib/reminders";
import { isHHMM } from "@/lib/reminders/time";

export const dynamic = "force-dynamic";

const NOTE =
  "Reminders follow the schedule on the prescription label, entered by the person or their guardian. iCare never suggests doses or changes; ask your pharmacist or doctor about any change.";

type Ctx = { params: Promise<{ memberId: string }> };

export const GET = withAuthErrors(async (req: Request, { params }: Ctx) => {
  const { memberId } = await params;
  if (!getMember(memberId)) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const { actor, subject } = await authorizeMember("reminders", memberId);
  const days = Math.min(30, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 7));
  const schedules = await listSchedules(subject.id);
  const doses = await dosesFor(schedules, days);
  const canAct = (await capabilitiesOn(actor.id, subject.id)).includes("act");
  return NextResponse.json({ memberId, schedules, doses, adherence: adherence(doses), canAct, note: NOTE });
});

export const POST = withAuthErrors(async (req: Request, { params }: Ctx) => {
  const { memberId } = await params;
  if (!getMember(memberId)) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const { actor, subject } = await authorizeMember("act", memberId);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === "log") {
    const scheduleId = Number(body?.scheduleId);
    const status = body?.status === "skipped" ? "skipped" : body?.status === "taken" ? "taken" : null;
    const at = new Date(String(body?.scheduledFor ?? ""));
    const schedule = (await listSchedules(subject.id)).find((s) => s.id === scheduleId);
    if (!schedule || !status || Number.isNaN(at.getTime())) {
      return NextResponse.json({ error: 'Send { action: "log", scheduleId, scheduledFor, status: "taken" | "skipped" } for one of their schedules.' }, { status: 400 });
    }
    // Only real dose times, from 2 days ago through today
    const dose = (await dosesFor([schedule], 3)).find((d) => new Date(d.scheduledFor).getTime() === at.getTime());
    if (!dose) return NextResponse.json({ error: "That isn't one of their dose times from the last 2 days." }, { status: 400 });
    await saveDoseLog(schedule, at, status, actor.id);
    await logActivity(actor.id, subject.id, "dose.log", { medicine: schedule.medicine, scheduledFor: dose.scheduledFor, status });
    return NextResponse.json({ ok: true });
  }

  if (action === "add") {
    const medicine = typeof body?.medicine === "string" ? body.medicine.trim().toLowerCase() : "";
    const times = Array.isArray(body?.times) ? [...new Set(body.times.filter(isHHMM))].sort() : [];
    const label = typeof body?.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : "As on the label";
    if (!/^[a-z0-9][a-z0-9 \-]{1,48}$/.test(medicine) || times.length === 0 || times.length > 6) {
      return NextResponse.json({ error: "Give a medicine name and 1 to 6 times like 08:00." }, { status: 400 });
    }
    const schedule = await addSchedule(subject.id, medicine, label, times, actor.id);
    await logActivity(actor.id, subject.id, "reminder.add", { medicine, times });
    return NextResponse.json({ ok: true, schedule });
  }

  if (action === "remove") {
    const scheduleId = Number(body?.scheduleId);
    const removed = await removeSchedule(subject.id, scheduleId);
    if (!removed) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    await logActivity(actor.id, subject.id, "reminder.remove", { scheduleId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'action must be "log", "add" or "remove".' }, { status: 400 });
});
