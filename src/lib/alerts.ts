// Family alerts (server-only). Owner: Cam.
//
// Alerts are worked out on request from data iCare already has, never stored:
//   urgent     a check-in in the last 7 days mentioned emergency symptoms (from checkin_summaries)
//   attention  missed medicine doses in the last 2 days (from reminders)
//   attention  blood pressure averaged 140/90 or higher over the latest week of readings
// What each viewer sees follows the sharing level: details need the matching capability (checkins, reminders,
// trends). Basic connections only see "important alerts": the urgent one, in general words, plus a coarse status.
// Alerts state facts and suggest checking in or contacting a clinician; they never give medical advice.
import type { Capability } from "@/lib/auth";
import { getDailyMetrics } from "@/lib/sample-data/health";
import { getCheckinSummaries, tigerConfigured } from "@/lib/tiger";
import { recentMisses } from "@/lib/reminders";
import { clockLabel, medicineLabel } from "@/lib/reminders/labels";

export type Severity = "urgent" | "attention";
export type Status = "okay" | "check-in" | "urgent";

export interface Alert {
  id: string;
  subjectId: string; // account id
  kind: "emergency-checkin" | "missed-doses" | "blood-pressure";
  severity: Severity;
  title: string;
  detail: string;
  at: string; // ISO
  href: string; // where to look
}

export interface PersonAlerts {
  accountId: string;
  memberId: string;
  status: Status;
  statusText: string;
  alerts: Alert[];
}

const STATUS_TEXT: Record<Status, string> = { okay: "Doing okay", "check-in": "May need a check-in", urgent: "Needs attention now" };

interface Subject {
  accountId: string;
  memberId: string;
  firstName: string;
  self: boolean;
}

async function emergencyCheckins(memberId: string) {
  if (!tigerConfigured()) return [];
  try {
    const { checkins } = await getCheckinSummaries(memberId, 10);
    return checkins.filter((c) => c.emergency && Date.now() - new Date(c.startedAt).getTime() < 7 * 24 * 3600_000);
  } catch {
    return []; // table missing or database down: no check-in alerts rather than a broken dashboard
  }
}

function latestWeekBP(memberId: string) {
  const days = getDailyMetrics(memberId).filter((d) => d.bloodPressure).slice(-7);
  if (days.length < 5) return null;
  const avg = (f: (d: (typeof days)[number]) => number) => Math.round(days.reduce((s, d) => s + f(d), 0) / days.length);
  return { sys: avg((d) => d.bloodPressure!.systolic), dia: avg((d) => d.bloodPressure!.diastolic), from: days[0].date, to: days.at(-1)!.date };
}

const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Every alert about one person, at full detail (filter with `forViewer`). */
async function allAlerts(s: Subject): Promise<Alert[]> {
  const who = s.self ? "You" : s.firstName;
  const whose = s.self ? "your" : `${s.firstName}'s`;
  const out: Alert[] = [];

  for (const c of await emergencyCheckins(s.memberId)) {
    out.push({
      id: `checkin-${c.id}`, subjectId: s.accountId, kind: "emergency-checkin", severity: "urgent",
      title: `${s.self ? "Your" : `${s.firstName}'s`} check-in mentioned emergency symptoms`,
      detail: `${c.points[0] ?? "Possible emergency symptoms were mentioned."} The check-in told ${s.self ? "you" : "them"} to call 911 or go to the emergency room. ${s.self ? "If you haven't, call 911 now." : `Call ${s.firstName} now; if you can't reach them, call 911.`}`,
      at: c.startedAt, href: `/checkin`,
    });
  }

  const missed = await recentMisses(s.accountId, 48);
  if (missed.length) {
    const byDay = new Map<string, typeof missed>();
    for (const d of missed) byDay.set(d.date, [...(byDay.get(d.date) ?? []), d]);
    const parts = [...byDay.entries()].map(
      ([date, ds]) => `${ds.map((d) => `${medicineLabel(d.medicine)} (${clockLabel(d.time)})`).join(" and ")} on ${shortDate(date)}`,
    );
    out.push({
      id: `missed-${s.accountId}-${missed.at(-1)!.scheduledFor}`, subjectId: s.accountId, kind: "missed-doses", severity: "attention",
      title: `${who} missed ${missed.length} dose${missed.length > 1 ? "s" : ""} in the last 2 days`,
      detail: `Not logged as taken: ${parts.join("; ")}. ${s.self ? "If you took them, log them as taken." : `A quick call can help. If ${s.firstName} took them, log them as taken.`} Ask the pharmacist or doctor before making up a missed dose.`,
      at: missed.at(-1)!.scheduledFor, href: `/family/${s.memberId}?tab=medicines`,
    });
  }

  const bp = latestWeekBP(s.memberId);
  if (bp && (bp.sys >= 140 || bp.dia >= 90)) {
    out.push({
      id: `bp-${s.memberId}-${bp.to}`, subjectId: s.accountId, kind: "blood-pressure", severity: "attention",
      title: `${whose.charAt(0).toUpperCase() + whose.slice(1)} blood pressure is running high`,
      detail: `Averaged ${bp.sys}/${bp.dia} mmHg over the latest week of readings (${shortDate(bp.from)} to ${shortDate(bp.to)}). Worth sharing with ${s.self ? "your" : "their"} doctor.`,
      at: `${bp.to}T12:00:00Z`, href: `/family/${s.memberId}?tab=bp`,
    });
  }
  return out;
}

const NEEDS: Record<Alert["kind"], Capability> = { "emergency-checkin": "checkins", "missed-doses": "reminders", "blood-pressure": "trends" };

/** Alerts about one person as a given viewer may see them. */
export async function alertsFor(s: Subject, caps: Capability[]): Promise<PersonAlerts> {
  const all = await allAlerts(s);
  const status: Status = all.some((a) => a.severity === "urgent") ? "urgent" : all.length ? "check-in" : "okay";
  const alerts: Alert[] = [];
  for (const a of all) {
    if (caps.includes(NEEDS[a.kind])) alerts.push(a);
    else if (a.severity === "urgent") {
      // Basic / Health summary: an important alert, in general words, with no health details
      alerts.push({
        ...a,
        title: `${s.firstName} may need help`,
        detail: `${s.firstName}'s recent check-in flagged something that may need urgent attention. Consider calling ${s.firstName}.`,
        href: `/family/${s.memberId}`,
      });
    }
  }
  return { accountId: s.accountId, memberId: s.memberId, status, statusText: STATUS_TEXT[status], alerts: alerts.sort((a, b) => (a.severity === b.severity ? b.at.localeCompare(a.at) : a.severity === "urgent" ? -1 : 1)) };
}
