// POST /api/ai/red-flag   Owner: Ish.
// Body: { "text": "what the person said" }  ->  { emergency: false }  or  { emergency: true, matched, message }
// The same emergency-phrase check the text check-in runs before calling Gemini, exposed for the
// FaceTime voice agent (chert-agent/), which checks each sentence the caller says.
import { NextResponse } from "next/server";
import { checkRedFlags } from "@/lib/ai/safety";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  if (typeof body?.text !== "string") return NextResponse.json({ error: 'Send JSON like {"text": "..."}.' }, { status: 400 });
  const flag = checkRedFlags(body.text.slice(0, 2000));
  return NextResponse.json(flag ?? { emergency: false });
}
