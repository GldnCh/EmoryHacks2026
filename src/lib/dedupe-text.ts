// Remove repeated sentences and headings from text, without dropping anything distinct. Owner: Jam.
// Used for FDA boxed warnings, which often contain the short "Highlights" warning and the full one back to back:
//   "WARNING: FETAL TOXICITY When pregnancy is detected, … WARNING: FETAL TOXICITY When pregnancy is detected, …"
// Only exact repeats are removed (ignoring case, spacing and punctuation); a sentence that differs at all is kept.

interface Unit {
  text: string;
  key: string; // comparison form: lowercase letters and digits only
  heading: boolean; // an ALL-CAPS heading like "WARNING: FETAL TOXICITY" or "(B) SPINAL/EPIDURAL HEMATOMA"
}

const keyOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

// A run of ALL-CAPS words at the start of a sentence, followed by normal text ("WARNING: X Drugs that …").
const LEADING_HEADING = /^((?:\(?[A-Z0-9][A-Z0-9:;,'()&/-]*\)?\s+)+?)(?=[A-Z][a-z])/;

/** Split text into sentences, then split leading ALL-CAPS headings (and lettered "(A) …" titles) off each one. */
function toUnits(text: string): Unit[] {
  const units: Unit[] = [];
  const add = (t: string, heading: boolean) => {
    const text = t.trim();
    if (text) units.push({ text, key: keyOf(text), heading });
  };
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const m = sentence.match(LEADING_HEADING);
    const head = m && /[A-Z]{3}/.test(m[1]) ? m[1] : "";
    // "WARNING: (A) X (B) Y (A) X" -> "WARNING:", "(A) X", "(B) Y", "(A) X"
    for (const part of head.split(/(?=\([A-Z]\)\s)/)) add(part, true);
    add(sentence.slice(head.length), false);
  }
  return units;
}

/**
 * Drop repeated sentences and headings.
 * - Sentences: keep the first copy.
 * - Headings: keep the copy that sits right before its own text. A list of titles followed by the full
 *   sections ("(A) X (B) Y (A) X details… (B) Y details…") keeps each title next to its details.
 */
export function dedupeSentences(text: string): string {
  const units = toUnits(text.replace(/\s+/g, " ").trim());
  const shown = new Set<string>();
  const out: string[] = [];
  units.forEach((u, i) => {
    if (!u.key || shown.has(u.key)) return;
    if (u.heading) {
      const next = units[i + 1];
      const appearsLater = units.slice(i + 1).some((v) => v.heading && v.key === u.key);
      if (next?.heading && appearsLater) return; // just a title in a list; it's shown later with its text
    }
    shown.add(u.key);
    out.push(u.text);
  });
  return out.join(" ");
}
