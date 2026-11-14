// One place where iCare calls Gemini. Owner: Ish. Server-only (uses GEMINI_API_KEY via src/lib/gemini.ts).
// Every call gets SAFETY_RULES prepended to its system instruction, so no feature can skip them.
import type { Content } from "@google/genai";
import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import { SAFETY_RULES } from "./safety";

export interface GenerateResult<T> {
  data: T | null; // parsed JSON, or null if Gemini's reply wasn't valid JSON
  raw: string; // Gemini's raw text, returned as a fallback when parsing fails
  model: string;
  ms: number;
}

/** Calls Gemini with the shared safety rules + a task-specific instruction and asks for a JSON reply. */
export async function generateJson<T>(opts: {
  instruction: string; // the task-specific part of the system instruction
  contents: string | Content[];
  maxOutputTokens?: number;
}): Promise<GenerateResult<T>> {
  const t0 = performance.now();
  const call = () =>
    getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: opts.contents,
      config: {
        systemInstruction: `${SAFETY_RULES}\n\n${opts.instruction}`,
        temperature: 0.4,
        responseMimeType: "application/json",
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
      },
    });
  let response;
  try {
    response = await call();
  } catch (err) {
    // One retry for temporary errors (model overloaded / rate limited), so a demo click doesn't fail on a blip.
    if (!isTemporary(err)) throw err;
    await new Promise((r) => setTimeout(r, 800));
    response = await call();
  }
  const raw = (response.text ?? "").trim();
  return { data: parseJson<T>(raw), raw, model: GEMINI_MODEL, ms: Math.round(performance.now() - t0) };
}

function isTemporary(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503;
}

/** Parses JSON, tolerating ```json fences. Returns null instead of throwing. */
export function parseJson<T>(raw: string): T | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/** Turns any Gemini/network error into a short message that's safe to show (never includes the key). */
export function aiErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("GEMINI_API_KEY is missing")) return "The AI isn't set up yet (GEMINI_API_KEY is missing).";
  if (/429|quota|rate/i.test(msg)) return "The AI is busy right now (rate limit). Please try again in a minute.";
  return "The AI couldn't answer right now. Please try again.";
}

export const asStringArray = (v: unknown, max = 6): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, max) : [];
