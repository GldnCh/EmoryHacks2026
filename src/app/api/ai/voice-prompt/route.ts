// GET /api/ai/voice-prompt   Owner: Ish.
// Everything the FaceTime voice agent (chert-agent/) needs to run a check-in, so the agent never keeps
// its own copy of our prompts or safety rules: the system instructions (SAFETY_RULES + check-in steps +
// all four Rivera profiles with their latest trends), the first greeting, and the exact emergency message.
// Only fabricated sample data is returned. No secrets.
import { NextResponse } from "next/server";
import { getFamily } from "@/lib/sample-data/health";
import { buildMemberContext } from "@/lib/ai/context";
import { VOICE_GREETING, voiceCheckinInstruction } from "@/lib/ai/checkin-prompt";
import { DISCLAIMER, EMERGENCY_MESSAGE, SAFETY_RULES } from "@/lib/ai/safety";

export const dynamic = "force-dynamic"; // always read the latest trends, never a build-time copy

export async function GET() {
  const family = getFamily();
  const owner = family.find((m) => m.relationship === "self")?.name.split(" ")[0] ?? "the account owner";
  const contexts = await Promise.all(
    family.map(async (m) => {
      const ctx = await buildMemberContext(m.id);
      return {
        id: m.id,
        firstName: m.name.split(" ")[0],
        relationship: m.relationship === "self" ? "the account owner" : `${owner}'s ${m.relationship}`,
        text: ctx?.text ?? "",
        source: ctx?.source,
      };
    }),
  );

  return NextResponse.json({
    instructions: `${SAFETY_RULES}\n\n${voiceCheckinInstruction(contexts)}`,
    greeting: VOICE_GREETING,
    emergencyMessage: EMERGENCY_MESSAGE,
    disclaimer: DISCLAIMER,
    dataSource: contexts[0]?.source ?? "sample data",
    members: contexts.map(({ id, firstName, relationship }) => ({ id, firstName, relationship })),
  });
}
