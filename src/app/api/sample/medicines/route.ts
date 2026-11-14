// GET /api/sample/medicines          -> the full sample medicine list
// GET /api/sample/medicines?q=allergy -> simple local text match (works without Typesense keys)
// Once Typesense is seeded (npm run seed:typesense), real search should go through Typesense instead.
import { NextResponse } from "next/server";
import data from "@/data/medicines.json";

export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase().trim();
  const meds = q
    ? data.medicines.filter((m) =>
        [m.genericName, ...m.brandNames, m.drugClass, ...m.commonUses].join(" ").toLowerCase().includes(q),
      )
    : data.medicines;
  return NextResponse.json({ sample: true, note: data._note, count: meds.length, medicines: meds });
}
