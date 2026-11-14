// GET /api/auth/accounts -> the demo "Apple ID" directory used by the sign-in screen (fictional people only).
// Real Sign in with Apple would replace this list with Apple's own sign-in sheet.
import { NextResponse } from "next/server";
import { listAccounts, storeInfo } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [accounts, info] = await Promise.all([listAccounts(), storeInfo()]);
  return NextResponse.json({ demo: true, source: info.source, accounts });
}
