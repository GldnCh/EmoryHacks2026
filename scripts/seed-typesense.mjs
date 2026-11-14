// Loads src/data/medicines.json into a Typesense collection called "medicines".
// Run from the project folder (needs TYPESENSE_HOST and TYPESENSE_API_KEY in .env.local):
//   npm run seed:typesense
// Safe to re-run: it drops and recreates the collection.
import { readFile } from "node:fs/promises";
import Typesense from "typesense";

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

const schema = {
  name: "medicines",
  fields: [
    { name: "genericName", type: "string" },
    { name: "brandNames", type: "string[]" },
    { name: "drugClass", type: "string", facet: true },
    { name: "commonUses", type: "string[]" },
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
const results = await client.collections("medicines").documents().import(medicines, { action: "upsert" });
const failed = results.filter((r) => !r.success);
console.log(`Imported ${results.length - failed.length}/${medicines.length} medicines into Typesense.`);
if (failed.length) {
  console.error("Failures:", failed.slice(0, 5));
  process.exit(1);
}

const test = await client.collections("medicines").documents().search({
  q: "allergies",
  query_by: "genericName,brandNames,commonUses,drugClass",
});
console.log(`Test search "allergies": ${test.found} results ->`, test.hits.map((h) => h.document.genericName).join(", "));
