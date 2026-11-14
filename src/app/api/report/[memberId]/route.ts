// GET /api/report/<memberId>  -> a one-page report to share with a doctor. Owner: Cam.
// Needs Full access ("checkins"): the person themselves, or someone they share Full with.
//
// Everything in the report is real data (profile, monthly trends, medicine adherence from reminders, recent
// check-ins, alerts). Gemini only writes a 2-3 sentence overview and "questions to ask the doctor" from that data,
// under the shared SAFETY_RULES and Cam's approved wording (questions to ask; never what to do about a medicine).
// Add ?refresh=1 to regenerate the AI part (cached per person for an hour so demo clicks are instant).
import { NextResponse } from "next/server";
import data from "@/data/medicines.json";
import { authorizeMember, capabilitiesOn, withAuthErrors } from "@/lib/auth";
import { alertsFor } from "@/lib/alerts";
import { formatTrendLine, getMonthlyTrends } from "@/lib/ai/context";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { DISCLAIMER } from "@/lib/ai/safety";
import { lookupCondition } from "@/lib/medical/conditions";
import { adherence, dosesFor, listSchedules } from "@/lib/reminders";
import { medicineLabel } from "@/lib/reminders/labels";
import { getMember } from "@/lib/sample-data/health";
import { getCheckinSummaries, tigerConfigured } from "@/lib/tiger";

export const dynamic = "force-dynamic";

type Med = { id: string; genericName: string; brandNames: string[]; drugClass: string };
const MEDS = new Map((data.medicines as Med[]).map((m) => [m.id, m]));

const INSTRUCTION = `
You help a family prepare for a doctor's visit. You get a person's report: conditions their doctor already diagnosed,
prescribed medicines, monthly averages from their watch and home devices, how many medicine doses were logged as taken,
recent check-in summaries and alerts.

Write:
- overview: 2 or 3 plain sentences describing what changed in the data over the year and recently, using only the numbers given. Mention any month that clearly stands out (for example the highest blood pressure or glucose month), and what came after it.
- questions: 3 to 5 short questions the person (or their caregiver) can ASK the doctor, each tied to something in the data,
  for example "My blood pressure averaged 150/89 in July and 128/78 in October. Is my current plan still right for me?"
  Phrase them as questions to ask. Never tell anyone what to do about a medicine (take, stop, skip, double, switch), never
  diagnose, never say what a number means medically.
- Point of view: if PREPARED BY says "the person themselves", write the overview with "you" and the questions with "my".
  If it was prepared by a caregiver, use the person's first name in the overview and write the questions for the caregiver
  to ask (for example "Rosa's blood pressure averaged ..."). If the person is a child, write for their parent.

Reply with ONLY a JSON object: {"overview": "...", "questions": ["...", "..."]}
`.trim();

/** Highest months, computed here so Gemini never has to search the table (it can mix up neighbouring months). */
function peaks(trends: { month: string; avgSystolic?: number; avgDiastolic?: number; avgBloodGlucose?: number }[]): string[] {
  const out: string[] = [];
  const bp = trends.filter((t) => t.avgSystolic != null);
  if (bp.length) {
    const top = bp.reduce((a, b) => (b.avgSystolic! > a.avgSystolic! ? b : a));
    out.push(`HIGHEST BLOOD PRESSURE MONTH: ${top.month} at ${top.avgSystolic}/${top.avgDiastolic}.`);
  }
  const gl = trends.filter((t) => t.avgBloodGlucose != null);
  if (gl.length) {
    const top = gl.reduce((a, b) => (b.avgBloodGlucose! > a.avgBloodGlucose! ? b : a));
    out.push(`HIGHEST FASTING GLUCOSE MONTH: ${top.month} at ${top.avgBloodGlucose} mg/dL.`);
  }
  return out;
}

const aiCache = new Map<string, { at: number; overview: string; questions: string[]; model: string }>();

export const GET = withAuthErrors(async (req: Request, { params }: { params: Promise<{ memberId: string }> }) => {
  const { memberId } = await params;
  const member = getMember(memberId);
  if (!member) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const { actor, subject } = await authorizeMember("checkins", memberId);
  const caps = await capabilitiesOn(actor.id, subject.id);

  const [{ trends, source }, schedules, checkins, alerts] = await Promise.all([
    getMonthlyTrends(memberId),
    listSchedules(subject.id),
    tigerConfigured() ? getCheckinSummaries(memberId, 5).then((r) => r.checkins).catch(() => []) : Promise.resolve([]),
    alertsFor({ accountId: subject.id, memberId, firstName: member.name.split(" ")[0], self: actor.id === subject.id }, caps),
  ]);

  const doses = await dosesFor(schedules, 30);
  const byMedicine = schedules.map((s) => {
    const a = adherence(doses.filter((d) => d.scheduleId === s.id));
    return { medicine: medicineLabel(s.medicine), label: s.label, times: s.times, ...a };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    member: { id: member.id, name: member.name, age: member.age, sex: member.sex, city: member.location.city, state: member.location.state },
    preparedBy: actor.displayName,
    conditions: member.conditions.map((c) => ({ name: c, plainName: lookupCondition(c)?.plainName ?? null })),
    medications: member.medications.map((id) => {
      const m = MEDS.get(id);
      return { id, name: m?.genericName ?? medicineLabel(id), brand: m?.brandNames[0] ?? null, drugClass: m?.drugClass ?? null };
    }),
    trends: { source, months: trends },
    adherence: { days: 30, overall: adherence(doses), byMedicine },
    checkins: checkins.map((c) => ({ startedAt: c.startedAt, points: c.points, nextStep: c.nextStep, emergency: c.emergency })),
    alerts: alerts.alerts.map((a) => ({ severity: a.severity, title: a.title, detail: a.detail })),
  };

  // AI overview + questions (optional: the report is complete without them)
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const cacheKey = `${memberId}:${actor.id === subject.id ? "self" : "caregiver"}`;
  const cached = aiCache.get(cacheKey);
  let ai: { overview: string; questions: string[]; model: string } | null = null;
  let aiError: string | null = null;
  if (cached && !refresh && Date.now() - cached.at < 3600_000) ai = cached;
  else {
    try {
      const prompt = [
        `PERSON: ${member.name}, age ${member.age}, ${member.sex}.`,
        `PREPARED BY: ${actor.id === subject.id ? "the person themselves" : `${actor.displayName}, their caregiver`}.`,
        `DIAGNOSED CONDITIONS: ${member.conditions.join("; ") || "none"}.`,
        `PRESCRIBED MEDICINES (do not suggest changes): ${report.medications.map((m) => m.name).join("; ") || "none"}.`,
        `MONTHLY AVERAGES (${source}), oldest to newest:`,
        ...trends.map(formatTrendLine),
        ...peaks(trends),
        `MEDICINE DOSES LOGGED, last 30 days: ${byMedicine.map((m) => `${m.medicine} ${m.taken}/${m.total} taken${m.missed ? `, ${m.missed} missed` : ""}`).join("; ") || "no reminders set up"}.`,
        `RECENT CHECK-INS: ${report.checkins.map((c) => `${c.startedAt.slice(0, 10)}: ${c.points.join(" ")}${c.emergency ? " (emergency symptoms mentioned)" : ""}`).join(" | ") || "none"}.`,
        `ALERTS: ${report.alerts.map((a) => a.title).join("; ") || "none"}.`,
      ].join("\n");
      const r = await generateJson<{ overview: string; questions: string[] }>({ instruction: INSTRUCTION, contents: prompt, maxOutputTokens: 700 });
      if (r.data && typeof r.data.overview === "string") {
        ai = { overview: r.data.overview.trim(), questions: asStringArray(r.data.questions, 5), model: r.model };
        aiCache.set(cacheKey, { ...ai, at: Date.now() });
      } else aiError = "The AI's answer couldn't be read. The rest of the report is complete.";
    } catch (err) {
      aiError = aiErrorMessage(err);
    }
  }

  return NextResponse.json({ ...report, ai, aiError, disclaimer: DISCLAIMER });
});
