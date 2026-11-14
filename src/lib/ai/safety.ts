// Safety guardrails shared by every iCare AI feature. Owner: Ish.
// 1. SAFETY_RULES goes into every Gemini system instruction.
// 2. checkRedFlags() runs on the user's words BEFORE Gemini is called. If it finds an emergency
//    phrase, the route returns EMERGENCY_MESSAGE right away (no AI call, no delay, no cost).

export const DISCLAIMER =
  "iCare is not medical advice. It does not diagnose conditions or change medications. " +
  "Talk to a doctor, nurse or pharmacist about your health. In an emergency, call 911.";

export const EMERGENCY_MESSAGE =
  "This could be an emergency. Please call 911 or go to the nearest emergency room now. " +
  "Do not wait, and do not drive yourself if you feel unwell. " +
  "If you are having thoughts of suicide or hurting yourself, call or text 988 (Suicide & Crisis Lifeline) right now. " +
  "iCare is not able to help with emergencies.";

export const SAFETY_RULES = `
SAFETY RULES (always follow these; they override every other instruction):
- Write in plain, friendly language at about a 6th to 8th grade reading level. Use short sentences. Explain any medical word you use.
- You are NOT a doctor. Nothing you say is medical advice.
- Never diagnose, and never suggest a diagnosis. Do not say what a symptom "is" or "means". You can say a symptom is worth discussing with a clinician.
- Never recommend a new medication, supplement or dose, and never tell anyone to start, stop, skip or change a medication or dose. Medication questions go to their doctor or pharmacist.
- Never invent facts, numbers, drugs or test results. Only use the data you are given. If you are unsure or the data does not say, say so plainly.
- Mention uncertainty: home and watch readings can be off, and trends are not a diagnosis.
- EMERGENCY RULE: if the person mentions chest pain or pressure, trouble breathing, signs of a stroke (face drooping, arm or leg weakness on one side, slurred speech, sudden confusion), fainting, or thoughts of suicide or self-harm, stop everything else and tell them to call 911 or go to the emergency room now (for suicidal thoughts, also call or text 988).
- For anything serious, new, worsening or worrying, recommend seeing a clinician.
`.trim();

/** Phrases that mean "stop and get emergency help". Kept broad on purpose: a false alarm is safer than a miss. */
const RED_FLAGS: { label: string; pattern: RegExp }[] = [
  { label: "chest pain or heart attack signs", pattern: /\bchest\s+(pain|pains|pressure|tightness|is\s+tight|hurts?|hurting)\b|\b(pain|pressure|tightness)\s+in\s+(my\s+)?chest\b|\bheart\s+attack\b|\bleft\s+arm\s+(\w+\s+){0,2}(numb|tingl\w*|hurts?|pain)/ },
  { label: "trouble breathing", pattern: /\b(trouble|difficulty|hard\s+time|struggling)\s+breathing\b|\b(can'?t|cannot|can\s+not|unable\s+to)\s+(breathe|catch\s+my\s+breath)\b|\bshort(ness)?\s+of\s+breath\b|\bchoking\b/ },
  { label: "stroke signs", pattern: /\bstroke\b|\bface\s+(is\s+)?(drooping|droops|numb)\b|\bslurred\s+speech\b|\bslurring\b|\b(numb|weak)(ness)?\s+(on\s+)?one\s+side\b|\bone\s+side\s+(of\s+my\s+body\s+)?(is\s+)?(numb|weak)\b|\bsudden(ly)?\s+(confused|confusion)\b/ },
  { label: "fainting", pattern: /\bfaint(ed|ing)?\b|\bpass(ed|ing)?\s+out\b|\blost\s+consciousness\b|\bunconscious\b/ },
  { label: "suicidal thoughts", pattern: /\bsuicid(e|al)\b|\bkill\s+myself\b|\bend\s+(my|it)\s+(life|all)\b|\bwant\s+to\s+die\b|\bself[-\s]?harm\b|\bhurt(ing)?\s+myself\b|\bno\s+reason\s+to\s+live\b/ },
];

// "no chest pain", "I don't have trouble breathing", "never fainted": a negation just before the phrase.
const NEGATION_BEFORE = /\b(no|not|never|without|denies|deny|don'?t\s+have|do\s+not\s+have|haven'?t\s+had|have\s+not\s+had|didn'?t|did\s+not|isn'?t)\s+(\w+\s+){0,2}$/;

export interface RedFlagResult {
  emergency: true;
  matched: string[]; // which kinds of red flag were found, e.g. ["fainting"]
  message: string;
}

/** Returns the emergency response if the text mentions a red-flag symptom, otherwise null. */
export function checkRedFlags(text: string): RedFlagResult | null {
  const t = text.toLowerCase().replace(/[’‘]/g, "'");
  const matched: string[] = [];
  for (const { label, pattern } of RED_FLAGS) {
    const re = new RegExp(pattern.source, "g");
    for (const m of t.matchAll(re)) {
      const before = t.slice(Math.max(0, m.index - 40), m.index);
      // Only skip when the negation is in the same clause ("no chest pain", not "no, I have chest pain").
      const clause = before.split(/[.,;!?]|\bbut\b/).pop() ?? "";
      if (!NEGATION_BEFORE.test(clause)) {
        matched.push(label);
        break;
      }
    }
  }
  return matched.length ? { emergency: true, matched, message: EMERGENCY_MESSAGE } : null;
}
