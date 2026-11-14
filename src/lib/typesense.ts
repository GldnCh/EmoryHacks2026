// Server-only Typesense client. Owner: Jam.
// Uses the admin key, so only call it from API routes, never the browser.
import Typesense from "typesense";

export function getTypesense() {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  if (!host || !apiKey) throw new Error("TYPESENSE_HOST / TYPESENSE_API_KEY missing. See docs/API-KEYS.md.");
  return new Typesense.Client({
    nodes: [{ host, port: 443, protocol: "https" }],
    apiKey,
    connectionTimeoutSeconds: 5,
  });
}
