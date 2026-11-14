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
import { textCheckinInstruction } from "@/lib/ai/checkin-prompt";

const MAX_USER_TURNS = 6;
const MAX_TEXT = 1000;

type Msg = { role: "user" | "model"; text: string };

interface CheckinReply {
  reply: string;
  done: boolean;
  summary?: { points: string[]; nextStep: string };
}

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
      instruction: textCheckinInstruction(ctx.text, firstName, turnsLeft),
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
