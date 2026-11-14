"use client";
// One-page report to share with a doctor (Cam): Print / Save as PDF. Needs Full access (/api/report/<id>).
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { monthLong, monthLabel } from "@/components/types";
import { useJson } from "@/components/useJson";
import { useMe } from "@/components/useMe";
import { SetupPrompt } from "@/components/SetupPrompt";

interface Month {
  month: string;
  avgSteps: number;
  avgRestingHeartRate: number;
  avgSleepHours: number;
  avgSystolic?: number;
  avgDiastolic?: number;
  avgBloodGlucose?: number;
}
interface Report {
  generatedAt: string;
  member: { id: string; name: string; age: number; sex: string; city: string; state: string };
  preparedBy: string;
  conditions: { name: string; plainName: string | null }[];
  medications: { id: string; name: string; brand: string | null; drugClass: string | null }[];
  trends: { source: string; months: Month[] };
  adherence: {
    days: number;
    overall: { taken: number; missed: number; total: number; percent: number | null };
    byMedicine: { medicine: string; label: string; times: string[]; taken: number; missed: number; total: number; percent: number | null }[];
  };
  checkins: { startedAt: string; points: string[]; nextStep: string; emergency: boolean }[];
  alerts: { severity: string; title: string; detail: string }[];
  ai: { overview: string; questions: string[]; model: string } | null;
  aiError: string | null;
  disclaimer: string;
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="break-inside-avoid border-t border-line pt-4">
      <h2 className="text-headline">{title}</h2>
      {note && <p className="mt-0.5 text-caption text-muted">{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

const dateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function DoctorReportPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { me } = useMe();
  const { data: r, error, status, retry } = useJson<Report>(me?.setUp ? `/api/report/${memberId}` : null);

  if (me && !me.setUp) return <SetupPrompt what="health reports" />;
  if (status === 403) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader back={{ href: `/family/${memberId}`, label: "Back" }} title="Doctor report" />
        <p className="card p-6 text-subhead text-secondary">Only the person, or someone they share Full access with, can prepare their doctor report.</p>
      </div>
    );
  }
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (!r) return <CardSkeleton lines={4} />;

  const first = r.member.name.split(" ")[0];
  const months = r.trends.months;
  const hasBP = months.some((m) => m.avgSystolic != null);
  const hasGlucose = months.some((m) => m.avgBloodGlucose != null);

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/family/${memberId}`} className="btn btn-tertiary">
          ‹ Back to {first}
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>

      <article className="card flex flex-col gap-4 p-6 sm:p-8 print:p-0 print:shadow-none">
        <header>
          <p className="text-footnote font-semibold uppercase tracking-wide text-brand">iCare · Health report for the doctor</p>
          <h1 className="mt-1 text-large-title">{r.member.name}</h1>
          <p className="text-subhead text-secondary">
            {r.member.age} · {r.member.sex} · {r.member.city}, {r.member.state} · Prepared by {r.preparedBy} on {dateTime(r.generatedAt)}
          </p>
        </header>

        {r.ai ? (
          <>
            <Section title="Overview" note="Written by Gemini from the data in this report. Not medical advice.">
              <p className="text-subhead">{r.ai.overview}</p>
            </Section>
            {r.ai.questions.length > 0 && (
              <Section title="Questions to ask the doctor">
                <ol className="list-decimal space-y-1.5 pl-5 text-subhead">
                  {r.ai.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </Section>
            )}
          </>
        ) : (
          r.aiError && <p className="no-print rounded-xl bg-fill px-4 py-3 text-footnote text-secondary">{r.aiError}</p>
        )}

        {r.alerts.length > 0 && (
          <Section title="Recent alerts">
            <ul className="space-y-1.5 text-subhead">
              {r.alerts.map((a) => (
                <li key={a.title}>
                  <span className={`font-semibold ${a.severity === "urgent" ? "text-danger" : ""}`}>{a.title}.</span> <span className="text-secondary">{a.detail}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <Section title="Conditions" note="Diagnosed by their doctor">
            <ul className="space-y-1 text-subhead">
              {r.conditions.map((c) => (
                <li key={c.name}>
                  {c.name}
                  {c.plainName && c.plainName !== c.name && <span className="text-secondary"> ({c.plainName})</span>}
                </li>
              ))}
              {r.conditions.length === 0 && <li className="text-muted">None on file</li>}
            </ul>
          </Section>
          <Section title="Medicines" note="As prescribed">
            <ul className="space-y-1 text-subhead">
              {r.medications.map((m) => (
                <li key={m.id}>
                  {m.name}
                  {m.brand && <span className="text-secondary"> ({m.brand})</span>}
                  {m.drugClass && <span className="block text-footnote text-muted">{m.drugClass}</span>}
                </li>
              ))}
              {r.medications.length === 0 && <li className="text-muted">None on file</li>}
            </ul>
          </Section>
        </div>

        {r.adherence.byMedicine.length > 0 && (
          <Section
            title={`Doses taken, last ${r.adherence.days} days`}
            note={`Logged in iCare from medicine reminders${r.adherence.overall.percent != null ? ` · ${r.adherence.overall.percent}% overall` : ""}`}
          >
            <table className="w-full text-subhead">
              <tbody>
                {r.adherence.byMedicine.map((m) => (
                  <tr key={m.medicine + m.times.join()} className="border-b border-line last:border-0">
                    <td className="py-1.5 pr-3 font-semibold">{m.medicine}</td>
                    <td className="py-1.5 pr-3 text-secondary">{m.label}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {m.taken}/{m.total} taken{m.missed ? `, ${m.missed} missed` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="Monthly averages" note={`From Apple Health-style watch and home readings (${r.trends.source}), ${monthLong(months[0]?.month ?? "")} to ${monthLong(months.at(-1)?.month ?? "")}`}>
          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full min-w-[480px] text-footnote tabular-nums">
              <thead>
                <tr className="text-left text-muted">
                  <th className="py-1 pr-2 font-medium">Month</th>
                  <th className="py-1 pr-2 text-right font-medium">Steps/day</th>
                  <th className="py-1 pr-2 text-right font-medium">Resting HR</th>
                  <th className="py-1 pr-2 text-right font-medium">Sleep</th>
                  {hasBP && <th className="py-1 pr-2 text-right font-medium">BP</th>}
                  {hasGlucose && <th className="py-1 text-right font-medium">Fasting glucose</th>}
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t border-line">
                    <td className="py-1 pr-2">{monthLabel(m.month)}</td>
                    <td className="py-1 pr-2 text-right">{m.avgSteps.toLocaleString()}</td>
                    <td className="py-1 pr-2 text-right">{m.avgRestingHeartRate} bpm</td>
                    <td className="py-1 pr-2 text-right">{m.avgSleepHours} h</td>
                    {hasBP && <td className="py-1 pr-2 text-right">{m.avgSystolic != null ? `${m.avgSystolic}/${m.avgDiastolic}` : "–"}</td>}
                    {hasGlucose && <td className="py-1 text-right">{m.avgBloodGlucose != null ? `${m.avgBloodGlucose} mg/dL` : "–"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {r.checkins.length > 0 && (
          <Section title="Recent check-ins" note="Summaries of iCare's AI wellness check-ins (FaceTime). Only summaries are kept, never what was said.">
            <ul className="space-y-3 text-subhead">
              {r.checkins.map((c) => (
                <li key={c.startedAt}>
                  <p className="font-semibold">
                    {dateTime(c.startedAt)}
                    {c.emergency && <span className="ml-2 text-danger">Emergency symptoms mentioned</span>}
                  </p>
                  <ul className="list-disc pl-5 text-secondary">
                    {c.points.map((pt) => (
                      <li key={pt}>{pt}</li>
                    ))}
                  </ul>
                  <p className="text-footnote text-muted">Next step given: {c.nextStep}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="border-t border-line pt-3 text-caption text-muted">
          {r.disclaimer} Readings from home devices and watches can be off. This demo uses a fictional family with generated data.
        </footer>
      </article>
    </div>
  );
}
