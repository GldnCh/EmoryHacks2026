"use client";
// Family overview (TD). One card per Rivera: latest month vs the month before, from /api/trends/<id>.
import Link from "next/link";
import Card from "@/components/Card";
import Disclaimer from "@/components/Disclaimer";
import StatTile from "@/components/StatTile";
import { CardSkeleton, ErrorNote, SourceBadge } from "@/components/Status";
import { RELATIONSHIP, monthLong, type Member, type TrendsResponse } from "@/components/types";
import { useJson } from "@/components/useJson";

function MemberCard({ member }: { member: Member }) {
  const { data, error, loading, retry } = useJson<TrendsResponse>(`/api/trends/${member.id}`);
  const remote = member.relationship === "parent";
  const latest = data?.trends.at(-1);
  const prev = data?.trends.at(-2);

  return (
    <Card
      className={remote ? "ring-2 ring-brand/40" : ""}
      title={
        <Link href={`/family/${member.id}`} className="hover:text-brand">
          {member.name}
        </Link>
      }
      subtitle={`${RELATIONSHIP[member.relationship]} · ${member.age} · ${member.location.city}, ${member.location.state}`}
      action={<SourceBadge source={data?.source} queryMs={data?.queryMs} />}
    >
      {remote && (
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          <span aria-hidden>📍</span> Tracked remotely from {member.location.city}
        </p>
      )}
      <p className="mb-3 text-sm text-secondary">
        <span className="text-muted">Conditions: </span>
        {member.conditions.join(", ") || "None on file"}
      </p>

      {error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : latest ? (
        <>
          <p className="mb-2 text-xs text-muted">Monthly average, {monthLong(latest.month)}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="Steps per day" value={latest.avgSteps} previous={prev?.avgSteps} betterWhen="up" />
            <StatTile label="Resting heart rate" value={latest.avgRestingHeartRate} previous={prev?.avgRestingHeartRate} unit="bpm" decimals={1} betterWhen="down" />
            <StatTile label="Sleep" value={latest.avgSleepHours} previous={prev?.avgSleepHours} unit="hr" decimals={1} betterWhen="up" />
            {latest.avgSystolic != null && (
              <StatTile
                label="Blood pressure"
                value={latest.avgSystolic}
                previous={prev?.avgSystolic}
                display={`${latest.avgSystolic}/${latest.avgDiastolic}`}
                unit="mmHg"
                betterWhen="down"
              />
            )}
            {latest.avgBloodGlucose != null && (
              <StatTile label="Fasting glucose" value={latest.avgBloodGlucose} previous={prev?.avgBloodGlucose} unit="mg/dL" betterWhen="down" />
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">No trend data yet.</p>
      )}

      <Link href={`/family/${member.id}`} className="mt-4 inline-block text-sm font-medium text-brand">
        View {member.name.split(" ")[0]}&apos;s full year →
      </Link>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, error, loading, retry } = useJson<{ family: Member[] }>("/api/sample/family");

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Family dashboard</h1>
        <p className="text-sm text-secondary">
          Each person&apos;s latest month compared with the month before. Blood pressure changes are shown for the top number (systolic).
        </p>
      </header>

      {error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : loading && !data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <CardSkeleton key={i} lines={2} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.family.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
