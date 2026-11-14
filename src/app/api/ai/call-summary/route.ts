// POST /api/ai/call-summary   Owner: Ish.
// Called ONLY by the FaceTime agent (chert-agent/) when a call ends: requires the x-icare-agent-token header
// (CHERT_AGENT_TOKEN), so nobody else can write check-ins into a family member's history.
// Body: { callId?, startedAt, endedAt, transcript: [{ "role": "user" | "model", "text": "..." }] }
// Gemini identifies which family member called and writes a short summary under the shared SAFETY_RULES.
// The summary (never the transcript) is saved to Tiger Data `checkin_summaries` as that member's history.
// Returns: { memberId, points, nextStep, emergency, saved, id?, disclaimer }
import { NextResponse } from "next/server";
import { getFamily } from "@/lib/sample-data/health";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { checkRedFlags, DISCLAIMER } from "@/lib/ai/safety";
import { saveCheckinSummary, tigerConfigured } from "@/lib/tiger";
import { isAgentRequest } from "@/lib/auth/agent-token";

const MAX_LINES = 120; // a 5-minute call is well under this
const MAX_TEXT = 1000;

type Line = { role: "user" | "model"; text: string };

interface CallSummary {
  memberId: string | null;
  points: string[];
  nextStep: string;
}

function parseBody(body: unknown) {
  const b = body as { callId?: unknown; startedAt?: unknown; endedAt?: unknown; transcript?: unknown };
  if (!b || !Array.isArray(b.transcript)) return 'Send JSON like {"startedAt": "...", "endedAt": "...", "transcript": []}.';
  const startedAt = new Date(String(b.startedAt));
  const endedAt = new Date(String(b.endedAt));
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) return "startedAt and endedAt must be timestamps.";
  if (b.transcript.length > MAX_LINES) return `A transcript can have at most ${MAX_LINES} lines.`;
  const transcript: Line[] = [];
  for (const l of b.transcript as { role?: unknown; text?: unknown }[]) {
    if ((l?.role !== "user" && l?.role !== "model") || typeof l.text !== "string") {
      return 'Each transcript line needs a role ("user" or "model") and text.';
    }
    const text = l.text.trim().slice(0, MAX_TEXT);
    if (text) transcript.push({ role: l.role, text });
  }
  const callId = typeof b.callId === "string" && b.callId.trim() ? b.callId.trim().slice(0, 200) : null;
  return { callId, startedAt, endedAt, transcript };
}

export async function POST(req: Request) {
  if (!isAgentRequest(req)) return NextResponse.json({ error: "Only the iCare FaceTime agent can save check-ins." }, { status: 401 });
  const parsed = parseBody(await req.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  const { callId, startedAt, endedAt, transcript } = parsed;

  if (!transcript.some((l) => l.role === "user")) {
    return NextResponse.json({ saved: false, reason: "The caller didn't say anything, so there is nothing to summarize." });
  }

  // The same emergency check the chat runs, over everything the caller said.
  const flag = checkRedFlags(transcript.filter((l) => l.role === "user").map((l) => l.text).join(". "));

  const family = getFamily();
  const instruction = `
You summarize a finished iCare wellness check-in phone call for the caller's health history.
The family on this account: ${family.map((m) => `${m.name} (id: ${m.id}, ${m.relationship})`).join("; ")}.

- memberId: the id of the family member the check-in was about (for a parent calling about a child, the child's id). Only pick someone if the caller said who they are (or who they were calling about) when the assistant asked. Never guess from symptoms or conditions; use null if it is not clear from the call.
- points: 2 to 5 short points of what the caller actually said about sleep, energy, pain, mood, medications and new symptoms. Use only what is in the transcript; never add details.
- nextStep: the one next step the assistant suggested, or if none, "Share anything that worries you with your clinician."
${flag ? "- The caller mentioned possible emergency symptoms. Include that as the first point, and make nextStep about getting urgent care." : ""}

Reply with ONLY a JSON object, no other text:
{"memberId": "jordan" or null, "points": ["..."], "nextStep": "..."}
`.trim();
  const text = transcript.map((l) => `${l.role === "user" ? "Caller" : "Assistant"}: ${l.text}`).join("\n");

  let summary: CallSummary;
  try {
    const { data } = await generateJson<CallSummary>({ instruction, contents: text, maxOutputTokens: 500 });
    const memberId = family.some((m) => m.id === data?.memberId) ? (data!.memberId as string) : null;
    const points = asStringArray(data?.points, 5);
    if (!points.length) throw new Error("Gemini returned no summary points");
    summary = { memberId, points, nextStep: String(data?.nextStep ?? "").trim() || "Share anything that worries you with your clinician." };
  } catch (err) {
    console.error("Call summary failed:", err);
    return NextResponse.json({ error: aiErrorMessage(err), disclaimer: DISCLAIMER }, { status: 502 });
  }

  const record = {
    ...summary,
    channel: "facetime" as const,
    callId,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    emergency: Boolean(flag),
  };
  if (!tigerConfigured()) {
    return NextResponse.json({ ...record, saved: false, reason: "TIGER_DATABASE_URL is not set.", disclaimer: DISCLAIMER });
  }
  try {
    const { id } = await saveCheckinSummary(record);
    return NextResponse.json({ ...record, saved: true, id, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error("Saving the call summary failed:", err);
    return NextResponse.json({ ...record, saved: false, reason: "The database couldn't save it.", disclaimer: DISCLAIMER }, { status: 500 });
  }
}
