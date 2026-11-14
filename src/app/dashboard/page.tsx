"use client";
// Family overview (TD; connections by Cam). One card per person this iPhone is connected to (and yourself):
// latest month vs the month before from /api/trends/<id> if they share trends, otherwise a basic status card.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Disclaimer from "@/components/Disclaimer";
import { ChevronRight, PinIcon } from "@/components/Icons";
import { METRICS } from "@/components/metrics";
import PageHeader from "@/components/PageHeader";
import StatTile from "@/components/StatTile";
import { CardSkeleton, ErrorNote, Skeleton, SourceBadge } from "@/components/Status";
import { monthLong, type TrendsResponse } from "@/components/types";
import { useJson } from "@/components/useJson";
import { usePeople, type PersonWithHealth } from "@/components/usePeople";
import { SetupPrompt } from "@/components/SetupPrompt";
import { BasicCard, LevelChip } from "@/components/PersonCards";
import FamilyAlerts, { StatusPill, type AlertsResponse, type PersonAlerts } from "@/components/FamilyAlerts";

function MemberCard({ p, status }: { p: PersonWithHealth; status?: PersonAlerts }) {
  const member = p.member;
  const { data, error, loading, retry } = useJson<TrendsResponse>(`/api/trends/${member.id}`);
  const remote = member.relationship === "parent" && !p.person.self;
  const latest = data?.trends.at(-1);
  const prev = data?.trends.at(-2);
  const first = member.name.split(" ")[0];

  return (
    <section className={`card flex flex-col p-5 sm:p-6 ${remote ? "ring-2 ring-brand/35" : ""}`} aria-labelledby={`m-${member.id}`}>
      {/* Header row is one big tap target into the person's page */}
      <Link href={`/family/${member.id}`} className="pressable group -m-2 flex items-center gap-3 rounded-2xl p-2 hover:bg-fill/60">
        <Avatar id={member.id} name={member.name} size={48} />
        <span className="min-w-0 flex-1">
          <span id={`m-${member.id}`} className="block text-headline">
            {member.name}
          </span>
          <span className="block truncate text-footnote text-secondary">
            {p.label} · {member.age} · {member.location.city}, {member.location.state}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {status && <StatusPill status={status.status} text={status.statusText} />}
        <LevelChip p={p} />
        {remote && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-caption font-semibold text-[var(--brand-pressed)]">
            <PinIcon size={13} strokeWidth={2.2} /> Tracked remotely from {member.location.city}
          </span>
        )}
        <SourceBadge source={data?.source} queryMs={data?.queryMs} />
      </div>

      {p.can("conditions") && (
        <p className="mt-3 text-subhead text-secondary">
          <span className="text-muted">Conditions: </span>
          {member.conditions.join(", ") || "None on file"}
        </p>
      )}

      <div className="mt-4 flex-1">
        {error ? (
          <ErrorNote message={error} onRetry={retry} />
        ) : loading && !data ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
        ) : latest ? (
          <>
            <p className="mb-2 text-footnote font-medium text-muted">Monthly average · {monthLong(latest.month)}</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <StatTile label="Steps per day" icon={METRICS.steps.icon} accent={METRICS.steps.accent} value={latest.avgSteps} previous={prev?.avgSteps} betterWhen="up" />
              <StatTile
                label="Resting heart rate"
                icon={METRICS.heart.icon}
                accent={METRICS.heart.accent}
                value={latest.avgRestingHeartRate}
                previous={prev?.avgRestingHeartRate}
                unit="bpm"
                decimals={1}
                betterWhen="down"
              />
              <StatTile label="Sleep" icon={METRICS.sleep.icon} accent={METRICS.sleep.accent} value={latest.avgSleepHours} previous={prev?.avgSleepHours} unit="hr" decimals={1} betterWhen="up" />
              {latest.avgSystolic != null && (
                <StatTile
                  label="Blood pressure"
                  icon={METRICS.bp.icon}
                  accent={METRICS.bp.accent}
                  value={latest.avgSystolic}
                  previous={prev?.avgSystolic}
                  display={`${latest.avgSystolic}/${latest.avgDiastolic}`}
                  unit="mmHg"
                  betterWhen="down"
                />
              )}
              {latest.avgBloodGlucose != null && (
                <StatTile
                  label="Fasting glucose"
                  icon={METRICS.glucose.icon}
                  accent={METRICS.glucose.accent}
                  value={latest.avgBloodGlucose}
                  previous={prev?.avgBloodGlucose}
                  unit="mg/dL"
                  betterWhen="down"
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-subhead text-muted">No trend data yet.</p>
        )}
      </div>

      <Link href={`/family/${member.id}`} className="btn btn-tertiary -mb-2 mt-3 self-start">
        {p.person.self ? "View your full year" : <>View {first}&apos;s full year</>}
        <ChevronRight size={15} />
      </Link>
    </section>
  );
}

/** What a Basic connection sees: a coarse status and, if something is urgent, a nudge to call. */
function BasicStatus({ s, first }: { s: PersonAlerts; first: string }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <StatusPill status={s.status} text={s.statusText} />
      <p className="text-subhead text-secondary">
        {s.status === "urgent"
          ? `Something may need urgent attention. Consider calling ${first}.`
          : s.status === "check-in"
            ? `${first} might appreciate a quick call.`
            : `${first} shares whether they're doing okay, plus important alerts. Health details stay private.`}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { me, people, error, retry } = usePeople();
  const alerts = useJson<AlertsResponse>(me?.setUp ? "/api/alerts" : null);
  const statusOf = (p: PersonWithHealth) => alerts.data?.people.find((x) => x.accountId === p.person.account.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Family dashboard"
        subtitle="You and the people you're connected to, each at the level they share. Monthly cards compare the latest month with the month before (blood pressure uses the top number)."
      >
        {me?.setUp && (
          <div className="mt-3">
            <Link href="/account" className="btn btn-secondary">
              Manage connections
            </Link>
          </div>
        )}
      </PageHeader>

      {error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : me && !me.setUp ? (
        <SetupPrompt />
      ) : !people ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      ) : (
        <>
        {alerts.data && <FamilyAlerts data={alerts.data} />}
        <div className="grid gap-4 lg:grid-cols-2">
          {people.map((p) => {
            const s = statusOf(p);
            return p.can("trends") ? (
              <MemberCard key={p.member.id} p={p} status={s} />
            ) : (
              <BasicCard key={p.member.id} p={p} status={s ? <BasicStatus s={s} first={p.member.name.split(" ")[0]} /> : undefined} />
            );
          })}
          {people.length === 0 && (
            <p className="card p-6 text-subhead text-secondary">
              No health profile is linked to this iPhone yet, and nobody has shared with you. Connect with family from{" "}
              <Link href="/account" className="font-semibold text-brand">
                My iCare
              </Link>
              .
            </p>
          )}
        </div>
        </>
      )}

      <Disclaimer />
    </div>
  );
}
