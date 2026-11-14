// Shared secret for server-to-server calls from the Chert FaceTime agent (chert-agent/) to iCare.
// The agent sends it in the `x-icare-agent-token` header; routes that only the agent should call check it,
// so nobody on the internet can write fake check-ins into a family member's history.
//
// CHERT_AGENT_TOKEN must be set in Vercel (Production + Preview) and in the agent's .env.local.
// If it's missing: production refuses agent calls; local development allows them (with a warning).
import { createHash, timingSafeEqual } from "node:crypto";

export const AGENT_TOKEN_HEADER = "x-icare-agent-token";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function isAgentRequest(req: Request): boolean {
  const expected = process.env.CHERT_AGENT_TOKEN;
  if (!expected) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[agent] CHERT_AGENT_TOKEN is not set; allowing agent calls in development only.");
    return true;
  }
  const got = req.headers.get(AGENT_TOKEN_HEADER) ?? "";
  // compare fixed-length digests so the check takes the same time whatever was sent
  return timingSafeEqual(digest(got), digest(expected));
}
