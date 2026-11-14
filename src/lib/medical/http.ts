// Shared fetch helper for the public medical APIs (no keys needed).
// Results are cached by Next.js for a day so the demo stays fast and we stay under rate limits.
export async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 86400 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // network error or timeout: callers fall back to our local sample data
  }
}

/** Trim long label text to something readable on a card. */
export function trimText(text: string | undefined, max = 600): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max).replace(/\s+\S*$/, "") + "…" : clean;
}

/** Remove characters that would break an API's query syntax. */
export const safeTerm = (s: string) => s.replace(/["\\:()[\]{}^~*?]/g, " ").trim().slice(0, 100);
