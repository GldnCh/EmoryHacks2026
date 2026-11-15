"use client";
// Family alerts (Cam): urgent and "worth a look" alerts about you and the people you're connected to, at the
// detail their sharing level allows. Data: /api/alerts (worked out live from check-ins, medicine logs, readings).
import Link from "next/link";
import { ChevronRight, WarningIcon } from "@/components/Icons";

export type Status = "okay" | "check-in" | "urgent";
export interface Alert {
  id: string;
  subjectId: string;
  kind: string;
  severity: "urgent" | "attention";
  title: string;
  detail: string;
  at: string;
  href: string;
}
export interface PersonAlerts {
  accountId: string;
  memberId: string;
  status: Status;
  statusText: string;
  alerts: Alert[];
}
export interface AlertsResponse {
  people: PersonAlerts[];
  note: string;
}

const PILL: Record<Status, string> = {
  okay: "bg-good-soft text-good",
  "check-in": "bg-warn-soft text-warn",
  urgent: "bg-[#fde8e6] text-danger",
};

export function StatusPill({ status, text }: { status: Status; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold ${PILL[status]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FamilyAlerts({ data, onlyAccount, title = "Family alerts", glass = false }: { data: AlertsResponse; onlyAccount?: string; title?: string; glass?: boolean }) {
  const alerts = data.people
    .filter((p) => !onlyAccount || p.accountId === onlyAccount)
    .flatMap((p) => p.alerts)
    .sort((a, b) => (a.severity === b.severity ? b.at.localeCompare(a.at) : a.severity === "urgent" ? -1 : 1));

  if (onlyAccount && alerts.length === 0) return null;

  return (
    <section
      aria-labelledby="alerts-heading"
      className={
        glass
          ? "rounded-[22px] border border-white/60 bg-white/65 p-4 shadow-[0_10px_28px_rgba(170,70,20,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl"
          : "card p-5 sm:p-6"
      }
    >
      <h2 id="alerts-heading" className="text-headline">
        {title}
        {alerts.length > 0 && <span className="ml-2 rounded-full bg-fill px-2 py-0.5 text-caption font-semibold text-secondary">{alerts.length}</span>}
      </h2>
      {alerts.length === 0 ? (
        <p className="mt-2 text-subhead text-secondary">No alerts. Everyone you&apos;re connected to is doing okay.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {alerts.map((a) => {
            const urgent = a.severity === "urgent";
            return (
              <li key={a.id} role={urgent ? "alert" : undefined} className={`rounded-2xl p-4 ${urgent ? "bg-[#fde8e6]" : "bg-warn-soft"}`}>
                <div className="flex gap-3">
                  <span className={`mt-0.5 shrink-0 ${urgent ? "text-danger" : "text-warn"}`}>
                    <WarningIcon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-subhead font-semibold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-footnote text-secondary">{a.detail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="text-caption text-muted">{ago(a.at)}</span>
                      <Link href={a.href} className="inline-flex min-h-8 items-center gap-0.5 text-footnote font-semibold text-brand hover:underline">
                        {a.kind === "emergency-checkin" && a.href === "/checkin" ? "See the check-in" : "Take a look"} <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-caption text-muted">{data.note}</p>
    </section>
  );
}
