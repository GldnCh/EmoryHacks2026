// POST /api/ai/explain-label   Owner: Ish.
// Body: { "name": "lisinopril", "readingLevel": "simple" | "standard" }
// Fetches the official FDA label (openFDA) and has Gemini explain it in plain language,
// using ONLY the label text. No label found -> we say so; Gemini is not called and nothing is guessed.
// Returns `explanation` (plain text, shown by the medicine page button) and `sections` (structured).
// A boxed warning (the FDA's most serious warning) is always returned word-for-word, even if the AI drops it.
import { NextResponse } from "next/server";
import { getDrugLabel, type DrugLabel } from "@/lib/medical/openfda";
import { aiErrorMessage, asStringArray, generateJson } from "@/lib/ai/generate";
import { DISCLAIMER } from "@/lib/ai/safety";

type Level = "simple" | "standard";

type Sections = Explanation;

interface Explanation {
  whatItsFor: string;
  boxedWarning: string | null;
  importantWarnings: string[];
  commonSideEffects: string[];
  askYourPharmacist: string[];
}

const cache = new Map<string, Record<string, unknown>>();

const LEVELS: Record<Level, string> = {
  simple: "Write for someone who reads at about a 5th to 6th grade level. Very short sentences. No medical words without a simple explanation.",
  standard: "Write for an adult at about an 8th grade level. Clear and direct; you may keep common medical terms if you explain them briefly.",
};

const instruction = (level: Level) =>
  `
You explain official FDA drug labels in plain language for IDoc users.
${LEVELS[level]}

Rules for this task:
- Use ONLY facts in the label text you are given. If a section is missing, leave that field empty instead of filling it in from general knowledge.
- Never give doses, dosing schedules or advice to start, stop or change the medicine.
- If the label has a BOXED WARNING, you MUST explain it in "boxedWarning". If there is none, set "boxedWarning" to null.
- "importantWarnings": up to 4 of the most important warnings or "do not use" points.
- "commonSideEffects": up to 6 side effects the label lists as common or most frequent.
- "askYourPharmacist": 3 or 4 short questions the person could ask their pharmacist or doctor, based on the label.

Reply with ONLY a JSON object, no other text:
{"whatItsFor": "...", "boxedWarning": "..." or null, "importantWarnings": ["..."], "commonSideEffects": ["..."], "askYourPharmacist": ["..."]}
`.trim();

/** The label sections Gemini is allowed to use. */
function labelText(l: DrugLabel): string {
  const sections: [string, string | undefined][] = [
    ["GENERIC NAME", l.genericName],
    ["BRAND NAMES", l.brandNames.join(", ")],
    ["PRESCRIPTION", l.isPrescription ? "yes" : "no (over the counter)"],
    ["PURPOSE", l.purpose],
    ["USES (INDICATIONS)", l.indications],
    ["BOXED WARNING", l.boxedWarning],
    ["WARNINGS", l.warnings],
    ["DO NOT USE", l.doNotUse],
    ["ASK A DOCTOR BEFORE USE", l.askDoctor],
    ["STOP USE AND ASK A DOCTOR IF", l.stopUse],
    ["ADVERSE REACTIONS (SIDE EFFECTS)", l.adverseReactions],
    ["DRUG INTERACTIONS", l.drugInteractions],
  ];
  return sections.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n\n");
}

const notFound = (name: string) =>
  `We couldn't find an official FDA label for "${name}", so IDoc won't guess. Check the spelling, or ask your pharmacist about this medicine.`;

/** The explanation as plain text, for simple UIs (the medicine page's button shows `explanation` as text). */
function asText(e: Sections, labelNote: string | null): string {
  const part = (title: string, items: string[]) => (items.length ? `${title}\n${items.map((i) => `• ${i}`).join("\n")}` : "");
  return [
    labelNote,
    e.boxedWarning ? `⚠ Boxed warning (the FDA's most serious): ${e.boxedWarning}` : "",
    `What it's for: ${e.whatItsFor}`,
    part("Important warnings:", e.importantWarnings),
    part("Common side effects:", e.commonSideEffects),
    part("Questions to ask your pharmacist:", e.askYourPharmacist),
    "Not medical advice. Based only on the FDA label; ask your pharmacist or doctor.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: unknown; readingLevel?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'Send JSON like {"name": "lisinopril", "readingLevel": "simple"}.' }, { status: 400 });
  }
  const level: Level = body?.readingLevel === "standard" ? "standard" : "simple";
  const key = `${name.toLowerCase()}:${level}`;
  if (cache.has(key)) return NextResponse.json({ ...cache.get(key), cached: true });

  const label = await getDrugLabel(name);
  if (!label) {
    return NextResponse.json(
      {
        found: false,
        name,
        message: notFound(name),
        error: notFound(name), // shown by the "Explain this label" button on the medicine page
        aiCalled: false,
        disclaimer: DISCLAIMER,
      },
      { status: 404 },
    );
  }

  // openFDA sometimes returns a combination product (e.g. "lisinopril AND hydrochlorothiazide") for a single drug.
  // Say so clearly instead of presenting it as the label for the medicine the user asked about.
  // Salt forms are fine ("cetirizine" -> "CETIRIZINE HYDROCHLORIDE"); combinations and unrelated names are flagged.
  const labelName = label.genericName ?? label.brandNames[0] ?? "";
  const q = name.toLowerCase();
  const all = [labelName, ...label.brandNames].map((s) => s.toLowerCase());
  const isCombination = (s: string) => /\band\b|,|\//.test(s);
  const mentionsName = all.some((s) => s.includes(q));
  const labelNote =
    mentionsName && !(isCombination(labelName.toLowerCase()) && !isCombination(q))
      ? null
      : `The closest FDA label we found is for "${labelName}", which is not exactly the medicine you asked about. Check with your pharmacist.`;

  const base = {
    found: true,
    name,
    readingLevel: level,
    labelNote,
    label: {
      genericName: label.genericName,
      brandNames: label.brandNames,
      isPrescription: label.isPrescription,
      labelDate: label.labelDate,
      dailyMedUrl: label.dailyMedUrl,
      source: "openFDA",
    },
    // Always shown word-for-word: the AI's version is an explanation, not a replacement.
    boxedWarningOriginal: label.boxedWarning ?? null,
    disclaimer: `${DISCLAIMER} This explanation is based on the FDA label and may leave things out; read the full label or ask your pharmacist.`,
  };

  try {
    const { data, raw, model, ms } = await generateJson<Explanation>({
      instruction: instruction(level),
      contents: `FDA LABEL TEXT:\n\n${labelText(label)}`,
    });
    if (!data || typeof data.whatItsFor !== "string") {
      // Gemini didn't return the JSON we asked for: show its text rather than nothing. Not cached.
      return NextResponse.json({ ...base, explanation: raw, sections: null, raw, aiCalled: true, model, aiMs: ms, cached: false });
    }

    let boxed = typeof data.boxedWarning === "string" && data.boxedWarning.trim() ? data.boxedWarning.trim() : null;
    if (label.boxedWarning && !boxed) {
      boxed = "This medicine has a boxed warning, the FDA's most serious kind of warning. Read it below and ask your pharmacist what it means for you.";
    }
    if (!label.boxedWarning) boxed = null; // never let the AI invent one

    const sections: Sections = {
      whatItsFor: data.whatItsFor,
      boxedWarning: boxed,
      importantWarnings: asStringArray(data.importantWarnings, 4),
      commonSideEffects: asStringArray(data.commonSideEffects, 6),
      askYourPharmacist: asStringArray(data.askYourPharmacist, 4),
    };
    const result = {
      ...base,
      explanation: asText(sections, labelNote), // plain text
      sections, // the same content, structured, for richer UIs
      aiCalled: true,
      model,
      aiMs: ms,
    };
    cache.set(key, result);
    return NextResponse.json({ ...result, cached: false });
  } catch (err) {
    console.error("AI label explanation failed:", err);
    return NextResponse.json({ ...base, error: aiErrorMessage(err) }, { status: 502 });
  }
}
