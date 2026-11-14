// GET /api/ai/summary/<memberId>?period=month   -> latest month vs the month before
// GET /api/ai/summary/<memberId>?period=year    -> the full 12 months
// Add &refresh=1 to skip the cache. Owner: Ish.
// Gemini writes a friendly report from the member's monthly trends (Tiger Data, or sample data).
// Results are cached in memory per member + period so repeated demo clicks are instant.
import { NextResponse } from "next/server";
import { buildMemberContext, formatTrendLine } from "@/lib/ai/context";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { DISCLAIMER } from "@/lib/ai/safety";
import type { MonthlySummary } from "@/lib/sample-data/health";

type Period = "month" | "year";

interface Summary {
  headline: string;
  highlights: string[];
  watchItems: string[];
  encouragement: string;
}

const cache = new Map<string, Record<string, unknown>>();

const INSTRUCTION = `
You are IDoc's health summary writer. You write a short, warm health report for a family using an app.
You will get a member's profile, family notes and monthly averages from their watch and home devices.

How to write it:
- Describe what changed in the numbers and connect it to the family notes only when the numbers support it (for example a new walking routine, an illness week, a stressful stretch, a medication review).
- Use the real numbers you were given. Round them simply. Never make up a number.
- Celebrate real progress. Be gentle about setbacks; never blame.
- watchItems are things worth mentioning to their doctor or pharmacist (for example blood pressure or glucose going up, a big drop in sleep). Say "ask your doctor about...", never what it means medically. If nothing stands out, include one item suggesting they keep sharing these trends at their next regular visit.
- If the person is a child, write for their parent.
- Do not diagnose. Do not suggest medicines, doses or medication changes.

Reply with ONLY a JSON object, no other text:
{"headline": "one short sentence", "highlights": ["3 to 5 short bullets"], "watchItems": ["0 to 3 short bullets"], "encouragement": "one or two warm sentences"}
`.trim();

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthName = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** "steps 8,120 -> 9,310 (+15%)" lines, computed here so Gemini never has to do math. */
function changes(prev: MonthlySummary, cur: MonthlySummary): string[] {
  const line = (label: string, a: number | undefined, b: number | undefined, unit = "") => {
    if (a == null || b == null) return null;
    const diff = Math.round((b - a) * 10) / 10;
    const pct = a ? Math.round(((b - a) / a) * 100) : 0;
    return `${label}: ${a}${unit} -> ${b}${unit} (${diff >= 0 ? "+" : ""}${diff}${unit}, ${pct >= 0 ? "+" : ""}${pct}%)`;
  };
  return [
    line("average steps per day", prev.avgSteps, cur.avgSteps),
    line("average resting heart rate", prev.avgRestingHeartRate, cur.avgRestingHeartRate, " bpm"),
    line("average sleep", prev.avgSleepHours, cur.avgSleepHours, " h"),
    line("total exercise", prev.totalExerciseMinutes, cur.totalExerciseMinutes, " min"),
    line("average systolic BP (top number)", prev.avgSystolic, cur.avgSystolic),
    line("average diastolic BP (bottom number)", prev.avgDiastolic, cur.avgDiastolic),
    line("average fasting glucose", prev.avgBloodGlucose, cur.avgBloodGlucose, " mg/dL"),
  ].filter((l): l is string => l !== null);
}

function isSummary(v: unknown): v is Summary {
  const s = v as Summary;
  return !!s && typeof s.headline === "string" && Array.isArray(s.highlights) && typeof s.encouragement === "string";
}

export async function GET(req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const url = new URL(req.url);
  const period: Period = url.searchParams.get("period") === "year" ? "year" : "month";
  const key = `${memberId}:${period}`;

  if (url.searchParams.get("refresh") !== "1" && cache.has(key)) {
    return NextResponse.json({ ...cache.get(key), cached: true });
  }

  const ctx = await buildMemberContext(memberId);
  if (!ctx) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  if (ctx.trends.length < 2) {
    return NextResponse.json({ error: "Not enough data for a summary yet.", disclaimer: DISCLAIMER }, { status: 422 });
  }

  const first = ctx.trends[0];
  const prev = ctx.trends[ctx.trends.length - 2];
  const cur = ctx.trends[ctx.trends.length - 1];
  const range = period === "month" ? monthName(cur.month) : `${monthName(first.month)} to ${monthName(cur.month)}`;

  const task =
    period === "month"
      ? [
          `Write the MONTHLY report for ${ctx.member.name.split(" ")[0]} for ${monthName(cur.month)}, compared with ${monthName(prev.month)}.`,
          `Changes from ${monthName(prev.month)} to ${monthName(cur.month)}:`,
          ...changes(prev, cur),
          `Use the yearly lines in the profile only as background.`,
        ]
      : [
          `Write the YEARLY report for ${ctx.member.name.split(" ")[0]} covering ${range}.`,
          `Tell the real story of the year: when things changed, the best and hardest months, and where they ended up.`,
          `Start vs end of the year:`,
          ...changes(first, cur),
          `Highest and lowest months are visible in the monthly lines in the profile.`,
        ];

  try {
    const { data, raw, model, ms } = await generateJson<Summary>({
      instruction: INSTRUCTION,
      contents: `${ctx.text}\n\n${task.join("\n")}`,
    });

    const base = {
      memberId,
      name: ctx.member.name,
      period,
      range,
      dataSource: ctx.source,
      model,
      aiMs: ms,
      disclaimer: DISCLAIMER,
    };

    if (!isSummary(data)) {
      // Gemini didn't return the JSON we asked for: show its text rather than nothing. Not cached.
      return NextResponse.json({ ...base, summary: null, raw, cached: false });
    }

    const result = {
      ...base,
      summary: {
        headline: data.headline,
        highlights: asStringArray(data.highlights, 5),
        watchItems: asStringArray(data.watchItems, 3),
        encouragement: data.encouragement,
      },
      // The numbers the summary was written from, so the UI can show them next to the text.
      basedOn: period === "month" ? [formatTrendLine(prev), formatTrendLine(cur)] : ctx.trends.map(formatTrendLine),
    };
    cache.set(key, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (err) {
    console.error("AI summary failed:", err);
    return NextResponse.json({ error: aiErrorMessage(err), disclaimer: DISCLAIMER }, { status: 502 });
  }
}
