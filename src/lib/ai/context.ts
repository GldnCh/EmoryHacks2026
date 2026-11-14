// Builds the short, plain-text member profile that every Gemini prompt uses. Owner: Ish.
// Compact on purpose (one line per month instead of JSON) to keep prompts small and cheap.
// Data: the fabricated Rivera family + monthly trends from Tiger Data (or the sample data fallback).
import data from "@/data/medicines.json";
import { getMember, getMonthlySummaries, type FamilyMember, type MonthlySummary } from "@/lib/sample-data/health";
import { getTrendsFromTiger, tigerConfigured } from "@/lib/tiger";
import { lookupCondition } from "@/lib/medical/conditions";

type Medicine = { id: string; genericName: string; brandNames: string[]; drugClass: string };
const MEDICINES = new Map((data.medicines as Medicine[]).map((m) => [m.id, m]));

export interface MemberContext {
  member: FamilyMember;
  trends: MonthlySummary[]; // last 12 months, oldest first
  source: "Tiger Data" | "sample data";
  text: string; // ready to paste into a prompt
}

/** Monthly trends from Tiger Data when it's configured, otherwise the built-in sample data (same shape). */
export async function getMonthlyTrends(memberId: string): Promise<{ trends: MonthlySummary[]; source: MemberContext["source"] }> {
  if (tigerConfigured()) {
    try {
      const { trends } = await getTrendsFromTiger(memberId, "1 month");
      if (trends.length) return { trends: trends.slice(-12), source: "Tiger Data" };
    } catch (err) {
      console.error("Tiger Data query failed, using sample data for AI context:", err);
    }
  }
  return { trends: getMonthlySummaries(memberId).slice(-12), source: "sample data" };
}

/** One short line per month, e.g. "2026-07: steps 4372, resting HR 75.2, sleep 7h, exercise 445 min, BP 150/89, glucose 157". */
export function formatTrendLine(t: MonthlySummary): string {
  const parts = [
    `steps ${t.avgSteps}/day`,
    `resting HR ${t.avgRestingHeartRate} bpm`,
    `sleep ${t.avgSleepHours} h`,
    `exercise ${t.totalExerciseMinutes} min total`,
  ];
  if (t.avgSystolic != null) parts.push(`BP ${t.avgSystolic}/${t.avgDiastolic}`);
  if (t.avgBloodGlucose != null) parts.push(`fasting glucose ${t.avgBloodGlucose} mg/dL`);
  return `${t.month}: ${parts.join(", ")}`;
}

/** Returns null for an unknown member id. */
export async function buildMemberContext(memberId: string): Promise<MemberContext | null> {
  const member = getMember(memberId);
  if (!member) return null;
  const { trends, source } = await getMonthlyTrends(memberId);

  const conditions = member.conditions.map((c) => {
    const plain = lookupCondition(c)?.plainName;
    return plain && plain !== c ? `${c} (${plain})` : c;
  });
  const meds = member.medications.map((id) => {
    const m = MEDICINES.get(id);
    return m ? `${m.genericName}${m.brandNames[0] ? ` (${m.brandNames[0]})` : ""}, ${m.drugClass}` : id;
  });

  const text = [
    `MEMBER: ${member.name}, age ${member.age}, ${member.sex}, relationship to app user: ${member.relationship}, lives in ${member.location.city}, ${member.location.state}.`,
    `KNOWN CONDITIONS (already diagnosed by their doctor): ${conditions.join("; ") || "none listed"}.`,
    `CURRENT MEDICATIONS (prescribed; do not suggest changes): ${meds.join("; ") || "none listed"}.`,
    `FAMILY NOTES (what the family logged): ${member.notes}`,
    `MONTHLY AVERAGES from Apple Health-style data (${source}), oldest to newest:`,
    ...trends.map(formatTrendLine),
  ].join("\n");

  return { member, trends, source, text };
}
