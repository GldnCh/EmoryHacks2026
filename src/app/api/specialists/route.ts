// Find real, licensed specialists from the public NPI Registry.
//
// GET /api/specialists?memberId=rosa
//     -> for each of Rosa's conditions, the right kind of specialist near her home (Savannah, GA)
// GET /api/specialists?memberId=jordan&city=Decatur&state=GA
//     -> same, but near a different place
// GET /api/specialists?specialty=Allergy %26 Immunology&city=Atlanta&state=GA
//     -> any specialty, anywhere
import { NextResponse } from "next/server";
import { getMember } from "@/lib/sample-data/health";
import { lookupCondition } from "@/lib/medical/conditions";
import { searchProviders } from "@/lib/medical/npi";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const memberId = sp.get("memberId");
  const limit = Math.min(Number(sp.get("limit") ?? 5) || 5, 20);

  if (memberId) {
    const member = getMember(memberId);
    if (!member) return NextResponse.json({ error: `Unknown member "${memberId}"` }, { status: 404 });
    const where = {
      city: sp.get("city") ?? member.location.city,
      state: sp.get("state") ?? member.location.state,
    };
    // one search per specialty, even if two conditions share it (e.g. hypertension + cholesterol -> cardiology)
    const bySpecialty = new Map<string, string[]>();
    for (const c of member.conditions) {
      const info = lookupCondition(c);
      if (!info) continue;
      bySpecialty.set(info.specialty, [...(bySpecialty.get(info.specialty) ?? []), c]);
    }
    const groups = await Promise.all(
      [...bySpecialty].map(async ([specialty, forConditions]) => ({
        specialty,
        forConditions,
        providers: await searchProviders({ specialty, ...where, limit }),
      })),
    );
    return NextResponse.json({ member: { id: member.id, name: member.name }, near: where, groups, source: "NPI Registry (CMS)" });
  }

  const specialty = sp.get("specialty");
  if (!specialty) return NextResponse.json({ error: "Pass ?memberId= or ?specialty=" }, { status: 400 });
  const providers = await searchProviders({
    specialty,
    city: sp.get("city") ?? undefined,
    state: sp.get("state") ?? undefined,
    postalCode: sp.get("zip") ?? undefined,
    limit,
  });
  return NextResponse.json({ specialty, count: providers.length, providers, source: "NPI Registry (CMS)" });
}
