// POST /api/medicines/photo   Owner: Jam.
// Body: { "image": "data:image/jpeg;base64,..." }  (JPEG, PNG or WebP; at most 3 MB after decoding, else 413)
//
// Gemini reads ONLY the drug names printed on a medicine box or pill-bottle label, then each name goes through
// the normal medicine search (searchMedicines, the same code as /api/medicines/search).
// Response: { names, results, message?, disclaimer }
//
// Safety:
// - Never identifies a pill from its shape, color or imprint. A photo of loose pills returns names: [] and asks for
//   a photo of the label instead (Gemini classifies the photo, and the server enforces it).
// - Only names come back: no doses, directions or advice. Numbers and units are stripped from the names server-side.
// - The image is never stored or logged. It lives only in this request's memory and is sent to Gemini once.
import { NextResponse } from "next/server";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { MEDICINE_DISCLAIMER, searchMedicines } from "@/lib/medicine-lookup";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_BODY_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 1024; // base64 of 3 MB + JSON wrapper
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_NAMES = 3;

const DISCLAIMER = `${MEDICINE_DISCLAIMER} Names are read from your photo by AI and can be wrong: check them against the label.`;
const MSG_PILLS = "Take a photo of the label or box instead.";
const MSG_NONE = "We couldn't read a medicine name in this photo. Take a clear, close photo of the label or box, or type the name.";

const INSTRUCTION = `
You read medicine packaging photos for iCare's medicine search. Your ONLY job is to copy drug names that are printed as text on a label.

Rules:
- Return only medicine names (brand or generic) that you can actually READ as printed text on a box, bottle label, blister pack or package insert in the photo.
- Copy the name as printed, without strength, dose, form or amounts (for "Lisinopril Tablets USP 10 mg" return "Lisinopril").
- Never identify a pill, tablet or capsule from its shape, color, size, markings or imprint code. If the photo shows pills, tablets or capsules without a readable label naming the drug, set "photo" to "loose_pills" and "names" to [].
- Never guess. If text is blurry, cut off or you are not sure it is a medicine name, leave it out. Do not add names that are not printed in the photo.
- Do not return doses, directions, warnings, advice or anything else.
- If the photo is not of medicine packaging, set "photo" to "other" and "names" to [].

Reply with ONLY this JSON, no other text:
{"photo": "label" | "loose_pills" | "other", "names": ["..."]}
`.trim();

/** Keep a short, plain name: drop strengths/units ("10 mg", "200MG", "5%") and anything that isn't name-like. */
function cleanName(raw: string): string | null {
  const name = raw
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|g|ml|%|iu|units?)\b/gi, "")
    .replace(/[^\p{L}\p{N}\s\-/&'.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 2 || name.length > 60 || !/\p{L}{2}/u.test(name)) return null;
  return name;
}

export async function POST(req: Request) {
  // Size first, before parsing anything (Vercel also rejects bodies over 4.5 MB on its own).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_CHARS) return tooBig();
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY_CHARS) return tooBig();

  let image: unknown;
  try {
    image = (JSON.parse(text) as { image?: unknown })?.image;
  } catch {
    image = undefined;
  }
  if (typeof image !== "string") {
    return NextResponse.json({ error: 'Send JSON like {"image": "data:image/jpeg;base64,..."}.' }, { status: 400 });
  }
  const match = DATA_URL.exec(image);
  if (!match) {
    return NextResponse.json({ error: "Send a JPEG, PNG or WebP photo." }, { status: 415 });
  }
  const [, mimeType, data] = match;
  const bytes = Math.floor((data.length * 3) / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) return tooBig();

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Search by photo isn't available right now. Type or say the medicine name instead.", disclaimer: DISCLAIMER },
      { status: 503 },
    );
  }

  let photo: string;
  let names: string[];
  try {
    const { data: reply } = await generateJson<{ photo?: unknown; names?: unknown }>({
      instruction: INSTRUCTION,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType, data } }, { text: "Which medicine names are printed on this label?" }],
        },
      ],
      maxOutputTokens: 200,
    });
    photo = typeof reply?.photo === "string" ? reply.photo : "other";
    const cleaned = asStringArray(reply?.names, 10).map(cleanName).filter((n): n is string => n !== null);
    names = [...new Map(cleaned.map((n) => [n.toLowerCase(), n])).values()].slice(0, MAX_NAMES);
  } catch (err) {
    // Log only the error text: never the request body or the image.
    console.error("[medicines/photo] Gemini failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: aiErrorMessage(err), disclaimer: DISCLAIMER }, { status: 502 });
  }

  // Loose pills: never return a name, even if the model offered one.
  if (photo === "loose_pills") {
    return NextResponse.json({ names: [], results: [], photo, message: MSG_PILLS, disclaimer: DISCLAIMER });
  }
  if (names.length === 0) {
    return NextResponse.json({ names: [], results: [], photo, message: MSG_NONE, disclaimer: DISCLAIMER });
  }

  // The normal search for each name; results merged in name order, without repeats.
  const searches = await Promise.all(names.map((n) => searchMedicines(n)));
  const seen = new Set<string>();
  const results = searches.flatMap((s, i) =>
    s.results
      .filter((r) => {
        const key = `${r.source}:${String(r.id ?? r.name).toLowerCase()}`;
        return seen.has(key) ? false : (seen.add(key), true);
      })
      .map((r) => ({ ...r, matchedName: names[i] })),
  );

  return NextResponse.json({
    names,
    results,
    photo,
    ...(results.length === 0 && { message: `We read "${names.join(", ")}" but found no matching medicines. Check the name on the label.` }),
    disclaimer: DISCLAIMER,
  });
}

function tooBig() {
  return NextResponse.json({ error: "That photo is too large. Use a photo under 3 MB." }, { status: 413 });
}
