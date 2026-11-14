// Server-only Gemini client. Owner: Ish.
// Never import this from a client component: it uses a secret key.
import { GoogleGenAI } from "@google/genai";

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing. See docs/API-KEYS.md.");
  return new GoogleGenAI({ apiKey });
}

// Default: gemini-3.5-flash-lite (answered in <1s in testing; gemini-2.5-flash is retired for new keys).
// Override with GEMINI_MODEL. `||` (not `??`) so an empty GEMINI_MODEL= line from .env.example falls back too.
// Current models: https://ai.google.dev/gemini-api/docs/models
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
