// GET /api/tiger/stats -> the numbers for the Tiger Data demo:
// rows stored, chunks, compression savings, continuous aggregates, and raw-vs-aggregate query speed.
import { NextResponse } from "next/server";
import { getTigerStats, tigerConfigured } from "@/lib/tiger";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!tigerConfigured()) {
    return NextResponse.json({ error: "Tiger Data isn't connected (TIGER_DATABASE_URL). See docs/API-KEYS.md." }, { status: 501 });
  }
  try {
    return NextResponse.json({ source: "Tiger Data", ...(await getTigerStats()) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Tiger Data query failed. Has `npm run seed:tiger` been run?" }, { status: 500 });
  }
}
