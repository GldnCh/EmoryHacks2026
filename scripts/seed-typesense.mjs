// Loads src/data/medicines.json into a Typesense collection called "medicines",
// enriched with public data so search finds more:
//   - RxNorm (NLM): standard id + every brand name ("Wal-Zyr" finds cetirizine)
//   - openFDA: the official "uses" text from the FDA label
// Run from the project folder (needs TYPESENSE_HOST and TYPESENSE_API_KEY in .env.local):
//   npm run seed:typesense                 (about 30 seconds: looks each medicine up)
//   npm run seed:typesense -- --no-enrich  (fast: our list only)
// Safe to re-run: it drops and recreates the collection.
import { readFile } from "node:fs/promises";
import Typesense from "typesense";

const enrich = !process.argv.includes("--no-enrich");
const host = process.env.TYPESENSE_HOST;
const apiKey = process.env.TYPESENSE_API_KEY;
if (!host || !apiKey) {
  console.error("Missing TYPESENSE_HOST or TYPESENSE_API_KEY in .env.local. See docs/API-KEYS.md.");
  process.exit(1);
}

const client = new Typesense.Client({
  nodes: [{ host, port: 443, protocol: "https" }],
  apiKey,
  connectionTimeoutSeconds: 10,
});

const { medicines } = JSON.parse(await readFile(new URL("../src/data/medicines.json", import.meta.url), "utf8"));

async function getJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
const clean = (s, max = 500) => (s ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function enrichOne(med) {
  const name = med.genericName.replace(/\s*\(.*\)$/, ""); // "Fluticasone (nasal)" -> "Fluticasone"
  const approx = await getJson(
    `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`,
  );
  const rxcui = approx?.approximateGroup?.candidate?.[0]?.rxcui;
  let rxBrands = [];
  if (rxcui) {
    const rel = await getJson(`https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/related.json?tty=BN`);
    rxBrands = (rel?.relatedGroup?.conceptGroup?.find((g) => g.tty === "BN")?.conceptProperties ?? [])
      .map((p) => p.name)
      .slice(0, 15);
  }
  const fda = await getJson(
    `https://api.fda.gov/drug/label.json?search=${encodeURIComponent(`openfda.generic_name:"${name}"`)}&limit=1`,
  );
  const label = fda?.results?.[0];
  return {
    ...med,
    rxcui: rxcui ?? "",
    allBrandNames: [...new Set([...med.brandNames, ...rxBrands])],
    fdaUses: clean(label?.indications_and_usage?.[0] ?? label?.purpose?.[0]),
  };
}

let docs = medicines;
if (enrich) {
  console.log(`Enriching ${medicines.length} medicines with RxNorm + openFDA...`);
  docs = [];
  for (const m of medicines) {
    docs.push(await enrichOne(m));
    await sleep(250); // be polite to the public APIs
  }
  const withFda = docs.filter((d) => d.fdaUses).length;
  const withRx = docs.filter((d) => d.rxcui).length;
  console.log(`RxNorm ids for ${withRx}/${docs.length}, FDA label text for ${withFda}/${docs.length}.`);
}

const schema = {
  name: "medicines",
  fields: [
    { name: "genericName", type: "string" },
    { name: "brandNames", type: "string[]" },
    { name: "allBrandNames", type: "string[]", optional: true },
    { name: "drugClass", type: "string", facet: true },
    { name: "commonUses", type: "string[]" },
    { name: "fdaUses", type: "string", optional: true },
    { name: "rxcui", type: "string", optional: true },
    { name: "forms", type: "string[]", facet: true },
    { name: "appearanceExample", type: "string" },
    { name: "prescriptionRequired", type: "bool", facet: true },
    { name: "commonSideEffects", type: "string[]" },
  ],
};

try {
  await client.collections("medicines").delete();
  console.log("Dropped old 'medicines' collection.");
} catch {
  // didn't exist yet
}
await client.collections().create(schema);
const results = await client.collections("medicines").documents().import(docs, { action: "upsert" });
const failed = results.filter((r) => !r.success);
console.log(`Imported ${results.length - failed.length}/${docs.length} medicines into Typesense.`);
if (failed.length) {
  console.error("Failures:", failed.slice(0, 5));
  process.exit(1);
}

const queryBy = enrich
  ? "genericName,allBrandNames,commonUses,drugClass,fdaUses"
  : "genericName,brandNames,commonUses,drugClass";
const test = await client.collections("medicines").documents().search({ q: "allergies", query_by: queryBy });
console.log(`Test search "allergies": ${test.found} results ->`, test.hits.map((h) => h.document.genericName).join(", "));
console.log(`Search your app with query_by: "${queryBy}"`);
