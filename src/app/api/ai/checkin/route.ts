// POST /api/ai/checkin   Owner: Ish.
// Body: { "memberId": "jordan", "messages": [{ "role": "user" | "model", "text": "..." }] }
//   Send an empty messages array to start; the AI asks the first question.
// Returns: { reply, done, summary?, emergency, turnsLeft, disclaimer }
// Safety: the latest user message is checked for emergency phrases BEFORE Gemini is called.
// Cost: conversations are capped at MAX_USER_TURNS answers and MAX_TEXT characters per message.
import { NextResponse } from "next/server";
import type { Content } from "@google/genai";
import { buildMemberContext } from "@/lib/ai/context";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { checkRedFlags, DISCLAIMER } from "@/lib/ai/safety";

const MAX_USER_TURNS = 6;
const MAX_TEXT = 1000;

type Msg = { role: "user" | "model"; text: string };

interface CheckinReply {
  reply: string;
  done: boolean;
  summary?: { points: string[]; nextStep: string };
}

const instruction = (context: string, firstName: string, turnsLeft: number) =>
  `
You are IDoc's wellness check-in assistant, talking directly with ${firstName} (with their parent instead, if ${firstName} is a child) in a friendly video or chat check-in. Speak to them as "you".
This is a quick wellness check-in, not a doctor's visit.

How to run the check-in:
- Be warm and brief: 1 to 3 short sentences per turn. Ask exactly ONE question per turn.
- Cover these topics in order, skipping any already answered: sleep, energy, pain or discomfort, mood and stress, taking their medications as prescribed, any new symptoms.
- Use what you know from their profile and recent trends to make questions personal (for example, mention that their steps went up, or ask about blood pressure if they track it). Do not read numbers back unless it helps.
- If they mention a symptom, acknowledge it kindly and ask one simple follow-up (how long, how bad from 1 to 10). Do not explain causes and do not diagnose.
- If they say they miss medication doses, don't lecture and don't tell them what to do with the dose; suggest they talk to their doctor or pharmacist.
- When all topics are covered, set "done" to true. In "reply" thank them and give the next step. In "summary" give 3 to 6 short points of what they shared and one "nextStep" (for example "Mention the knee pain to your primary care doctor" or "Share your blood pressure trend with your cardiologist at your next visit"). If anything sounds serious, new or worsening, the next step is to contact their clinician soon.
${turnsLeft <= 0 ? "- This is the LAST turn. You MUST set done to true now and include the summary." : `- You have at most ${turnsLeft} more questions, so keep moving.`}

${context}

Reply with ONLY a JSON object, no other text:
{"reply": "what you say to them", "done": false}
or, when finished:
{"reply": "thank you + next step", "done": true, "summary": {"points": ["..."], "nextStep": "..."}}
`.trim();

function parseBody(body: unknown): { memberId: string; messages: Msg[] } | string {
  const b = body as { memberId?: unknown; messages?: unknown };
  if (!b || typeof b.memberId !== "string") return 'Send JSON like {"memberId": "jordan", "messages": []}.';
  const raw = b.messages ?? [];
  if (!Array.isArray(raw)) return "messages must be an array.";
  const messages: Msg[] = [];
  for (const m of raw as { role?: unknown; text?: unknown }[]) {
    if ((m?.role !== "user" && m?.role !== "model") || typeof m.text !== "string") {
      return 'Each message needs a role ("user" or "model") and text.';
    }
    if (m.text.length > MAX_TEXT) return `Please keep each message under ${MAX_TEXT} characters.`;
    messages.push({ role: m.role, text: m.text.trim() });
  }
  if (messages.length && messages[messages.length - 1].role !== "user") return "The last message must be from the user.";
  return { memberId: b.memberId, messages };
}

export async function POST(req: Request) {
  const parsed = parseBody(await req.json().catch(() => null));
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  const { memberId, messages } = parsed;

  // 1. Emergency check first: no AI call, instant answer.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const flag = lastUser ? checkRedFlags(lastUser.text) : null;
  if (flag) {
    return NextResponse.json({
      reply: flag.message,
      done: true,
      emergency: true,
      matched: flag.matched,
      aiCalled: false,
      disclaimer: DISCLAIMER,
    });
  }

  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns > MAX_USER_TURNS) {
    return NextResponse.json(
      { error: "This check-in is complete. Start a new one any time.", done: true, disclaimer: DISCLAIMER },
      { status: 400 },
    );
  }

  const ctx = await buildMemberContext(memberId);
  if (!ctx) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
  const firstName = ctx.member.name.split(" ")[0];
  const turnsLeft = MAX_USER_TURNS - userTurns;

  // Gemini conversations must start with a user turn, so the check-in opens with one.
  // The member speaks for themselves; a child's check-in is done by their parent.
  const opener =
    ctx.member.relationship === "child"
      ? `Hi, I'm ${firstName}'s parent. I'm ready to start ${firstName}'s wellness check-in.`
      : `Hi, this is ${firstName}. I'm ready to start my wellness check-in.`;
  const contents: Content[] = [
    { role: "user", parts: [{ text: opener }] },
    ...messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
  ];

  try {
    const { data, raw, ms } = await generateJson<CheckinReply>({
      instruction: instruction(ctx.text, firstName, turnsLeft),
      contents,
      maxOutputTokens: 600,
    });

    const reply = typeof data?.reply === "string" && data.reply.trim() ? data.reply.trim() : raw;
    const done = Boolean(data?.done) || turnsLeft <= 0;
    const summary =
      done && data?.summary
        ? { points: asStringArray(data.summary.points, 6), nextStep: String(data.summary.nextStep ?? "") }
        : undefined;

    return NextResponse.json({
      reply,
      done,
      ...(summary ? { summary } : {}),
      emergency: false,
      aiCalled: true,
      aiMs: ms,
      turnsLeft: Math.max(0, turnsLeft),
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error("AI check-in failed:", err);
    return NextResponse.json({ error: aiErrorMessage(err), disclaimer: DISCLAIMER }, { status: 502 });
  }
}
