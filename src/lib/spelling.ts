// Spelling correction for medicine searches by use or symptom ("insomnea" -> "insomnia"). Owner: Jam.
// Typesense already forgives up to 2 typos inside our own list, but openFDA only matches exact words, so a typo
// in a symptom found nothing outside our 38 medicines. We correct the query first:
//   1. MedlinePlus (NLM) spelling suggestion: knows almost every health word
//   2. otherwise, the closest word from our own medicine data (uses, side effects, names)
// A correction is only accepted if it's close to what was typed (up to 3 letters, depending on word length),
// so a bad guess like MedlinePlus's "dyarea" -> "daycare" is ignored.
import data from "@/data/medicines.json";
import { getSpellingSuggestion } from "@/lib/medical/medlineplus";

export interface Correction {
  corrected: string; // e.g. "insomnia"
  source: "MedlinePlus" | "iCare medicine list";
}

/** How many letters may be wrong in a word of this length: 1 for short words, up to 3 for long ones. */
export function maxEdits(length: number): number {
  if (length < 4) return 0;
  if (length <= 5) return 1;
  if (length <= 7) return 2;
  return 3;
}

/**
 * Letters to add, remove, change or swap to turn `a` into `b` (Damerau-Levenshtein, optimal string alignment).
 * "insomnea" -> "insomnia" = 1, "insmonia" -> "insomnia" = 1 (swap), "constpaton" -> "constipation" = 2.
 */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/** True if `suggestion` is a plausible fix of `typed`: same number of words, each within its typo budget. */
export function isCloseEnough(typed: string, suggestion: string): boolean {
  const a = words(typed);
  const b = words(suggestion);
  if (!a.length || a.length !== b.length) return false;
  return a.every((w, i) => editDistance(w, b[i]) <= maxEdits(w.length));
}

// Every health word in our medicine list: uses, side effects and generic names (4+ letters).
const VOCABULARY = new Set(
  data.medicines.flatMap((m) => [...m.commonUses, ...m.commonSideEffects, m.genericName].flatMap(words)).filter((w) => w.length >= 4),
);

/**
 * In our vocabulary, or another form of a word that is: "allergy" (we have "allergies") isn't a typo.
 * Same start except the last 1-2 letters, and at least 5 letters in common.
 */
function isKnownWord(word: string): boolean {
  if (VOCABULARY.has(word)) return true;
  const stem = word.slice(0, Math.max(5, word.length - 2));
  return word.length >= 5 && [...VOCABULARY].some((v) => v.startsWith(stem));
}

/** The closest vocabulary word within the typo budget, or null. Ties go to the first found (most common uses first). */
function closestWord(word: string): string | null {
  if (isKnownWord(word) || maxEdits(word.length) === 0) return null;
  let best: string | null = null;
  let bestDistance = maxEdits(word.length) + 1;
  for (const v of VOCABULARY) {
    if (Math.abs(v.length - word.length) >= bestDistance) continue;
    const dist = editDistance(word, v);
    if (dist < bestDistance) [best, bestDistance] = [v, dist];
  }
  return best;
}

/** Fix each misspelled word from our own vocabulary; null if nothing changed. */
export function correctFromVocabulary(query: string): string | null {
  const original = words(query);
  const fixed = original.map((w) => closestWord(w) ?? w);
  return fixed.some((w, i) => w !== original[i]) ? fixed.join(" ") : null;
}

/** The corrected query, or null when it looks spelled right (or nothing close enough was found). */
export async function correctSpelling(query: string): Promise<Correction | null> {
  const q = query.trim().toLowerCase();
  if (q.length < 4) return null;
  const suggestion = await getSpellingSuggestion(q);
  if (suggestion && isCloseEnough(q, suggestion)) return { corrected: suggestion, source: "MedlinePlus" };
  const local = correctFromVocabulary(q);
  return local ? { corrected: local, source: "iCare medicine list" } : null;
}

/**
 * True if RxNorm's match really is the drug the person typed ("zyrtec" -> cetirizine, "lisinoprl" -> lisinopril).
 * RxNorm's approximate search always returns *something*: "insmonia" comes back as ethanol. Then it's not a drug name.
 */
export function looksLikeDrugName(query: string, rx: { ingredient: string; brandNames: string[] } | null): boolean {
  if (!rx) return false;
  const q = words(query).join("");
  return [rx.ingredient, ...rx.brandNames].some((name) => {
    const n = words(name).join("");
    return n.includes(q) || q.includes(n) || editDistance(q, n) <= maxEdits(q.length);
  });
}
