// GET /api/health -> shows which API keys are configured (true/false only, never the values).
// Use it after filling in .env.local to check your setup.
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    configured: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      typesense: Boolean(process.env.TYPESENSE_HOST && process.env.TYPESENSE_API_KEY),
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      tigerData: Boolean(process.env.TIGER_DATABASE_URL),
      // openFDA, RxNorm, MedlinePlus, NPI Registry and Clinical Tables need no keys
    },
  });
}
