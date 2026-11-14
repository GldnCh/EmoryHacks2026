// GET /api/medicines/<name>   e.g. /api/medicines/lisinopril or /api/medicines/zyrtec
// One medicine, combined from every source:
//   sample  -> our list (appearance, class, common uses)
//   rxnorm  -> standard generic name + all brand names
//   label   -> official FDA label (uses, warnings, side effects, interactions) + DailyMed link
//   info    -> MedlinePlus plain-language drug page
import { NextResponse } from "next/server";
import data from "@/data/medicines.json";
import { normalizeDrug } from "@/lib/medical/rxnorm";
import { getDrugLabel } from "@/lib/medical/openfda";
import { getDrugInfo } from "@/lib/medical/medlineplus";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent((await params).name).trim();
  if (name.length < 2) return NextResponse.json({ error: "name too short" }, { status: 400 });

  const rxnorm = await normalizeDrug(name);
  const generic = rxnorm?.ingredient ?? name;
  const lower = [name.toLowerCase(), generic.toLowerCase()];
  const sample =
    data.medicines.find(
      (m) =>
        lower.includes(m.id) ||
        lower.includes(m.genericName.toLowerCase()) ||
        m.brandNames.some((b) => lower.includes(b.toLowerCase())),
    ) ?? null;

  const [label, info] = await Promise.all([
    getDrugLabel(sample?.genericName ?? generic),
    rxnorm ? getDrugInfo(rxnorm.rxcui) : Promise.resolve([]),
  ]);

  if (!sample && !rxnorm && !label) {
    return NextResponse.json({ error: `No medicine found for "${name}"` }, { status: 404 });
  }
  return NextResponse.json({
    query: name,
    sample,
    rxnorm,
    label,
    info: info[0] ?? null,
    disclaimer:
      "General reference information from public sources (FDA, NLM), not medical advice. Do not rely on it for medical decisions; ask a pharmacist or doctor.",
  });
}
