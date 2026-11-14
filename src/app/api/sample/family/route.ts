// GET /api/sample/family -> the fictional sample family (fabricated demo data).
import { NextResponse } from "next/server";
import { getFamily } from "@/lib/sample-data/health";

export function GET() {
  return NextResponse.json({ sample: true, family: getFamily() });
}
