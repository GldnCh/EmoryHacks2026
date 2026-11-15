"use client";
// Family overview (TD; connections by Cam). One card per person this iPhone is connected to (and yourself):
// latest month vs the month before from /api/trends/<id> if they share trends, otherwise a basic status card.
import Link from "next/link";
import Avatar, { avatarPanel } from "@/components/Avatar";
import Disclaimer from "@/components/Disclaimer";
import { ChevronRight, PinIcon, WarningIcon } from "@/components/Icons";
import { notableChanges } from "@/components/Highlights";
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
  const alertCount = status?.alerts.length ?? 0;
  const changes = data ? notableChanges(data.trends).length : 0;

  return (
    <section className={`card flex flex-col overflow-hidden ${remote ? "ring-2 ring-brand/35" : ""}`} aria-labelledby={`m-${member.id}`}>
      {/* Header row (Health app "Sharing" style): avatar on a soft color panel, name, alerts and changes, chevron.
          One big tap target into the person's page. */}
      <Link href={`/family/${member.id}`} className="group flex items-stretch hover:bg-fill/40">
        <span aria-hidden className="grid w-[84px] shrink-0 place-items-center py-3 sm:w-[96px]" style={{ background: avatarPanel(member.id) }}>
          <Avatar id={member.id} name={member.name} size={56} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 pl-4 pr-3">
          <span className="flex items-center gap-2">
            <span id={`m-${member.id}`} className="min-w-0 flex-1 truncate text-headline">
              {member.name}
            </span>
            {latest && <span className="shrink-0 text-footnote text-secondary">{monthLong(latest.month).split(" ")[0].slice(0, 3)}</span>}
            <ChevronRight size={17} className="shrink-0 text-[#c4c4c7] transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="truncate text-footnote text-secondary">
            {p.label} · {member.age} · {member.location.city}, {member.location.state}
          </span>
          {alertCount > 0 && (
            <span className="flex items-center gap-1.5 text-subhead font-semibold">
              <WarningIcon size={16} className="text-warn" />
              {alertCount} {alertCount === 1 ? "Alert" : "Alerts"}
            </span>
          )}
          {data && (
            <span className="flex items-center gap-1.5 text-subhead text-secondary">
              {changes > 0 ? (
                <>
                  <StarBadge />
                  {changes} {changes === 1 ? "Change" : "Changes"} since {prev ? monthLong(prev.month).split(" ")[0] : "last month"}
                </>
              ) : (
                "No recent changes"
              )}
            </span>
          )}
        </span>
      </Link>

      <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
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
      </div>
    </section>
  );
}

/** Gray circled star, like the Health app's "Changes" line. Decorative. */
function StarBadge() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r="8" fill="#8e8e93" />
      <path d="M8 3.6l1.3 2.7 2.9.4-2.1 2 .5 2.9L8 10.2l-2.6 1.4.5-2.9-2.1-2 2.9-.4Z" fill="#fff" />
    </svg>
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
    <div className="flex flex-col gap-4 sm:gap-5">
      <PageHeader
        title="Family"
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
        <h2 className="-mb-2 text-title3">You &amp; Family</h2>
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
