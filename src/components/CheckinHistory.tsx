"use client";
// "Recent check-ins" on /checkin: FaceTime check-in summaries saved by the Chert agent. Owner: Ish.
// Shows this iPhone's owner plus anyone who shares Full access with them (the "checkins" capability),
// read from GET /api/checkins/<memberId>, which enforces the same permission on the server.
import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Disclaimer from "@/components/Disclaimer";
import SegmentedControl from "@/components/SegmentedControl";
import { InfoIcon, VideoIcon, WarningIcon } from "@/components/Icons";
import { CardSkeleton, ErrorNote, SourceBadge } from "@/components/Status";
import { useJson } from "@/components/useJson";
import { useMe } from "@/components/useMe";

interface Checkin {
  id: number;
  channel: string;
  callId: string | null;
  startedAt: string;
  endedAt: string;
  points: string[];
  nextStep: string;
  emergency: boolean;
}

interface CheckinsResponse {
  memberId: string;
  checkins: Checkin[];
  queryMs?: number;
  source?: string;
  disclaimer?: string;
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function formatLength(startedAt: string, endedAt: string) {
  const seconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min ? `${min} min ${sec} s` : `${sec} s`;
}

export default function CheckinHistory() {
  const { me } = useMe();
  // People the server refused (403), e.g. after sharing changed: hidden instead of showing an error.
  const [hidden, setHidden] = useState<string[]>([]);
  const people = (me?.people ?? []).filter(
    (p) => p.account.memberId && p.capabilities.includes("checkins") && !hidden.includes(p.account.memberId),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const memberId = people.find((p) => p.account.memberId === selected)?.account.memberId ?? people[0]?.account.memberId ?? null;

  const { data, error, loading, status, retry } = useJson<CheckinsResponse>(memberId ? `/api/checkins/${memberId}` : null);

  useEffect(() => {
    if (status === 403 && memberId) setHidden((h) => (h.includes(memberId) ? h : [...h, memberId]));
  }, [status, memberId]);

  const refresh = (
    <button onClick={retry} disabled={!memberId || loading} className="btn btn-secondary disabled:opacity-50">
      {loading ? "Refreshing…" : "Refresh"}
    </button>
  );

  let body: React.ReactNode;
  if (!me) {
    body = <CardSkeleton lines={2} />;
  } else if (!me.setUp || status === 401) {
    body = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-subhead text-secondary">Check-ins are private, so iCare needs to know whose iPhone this is.</p>
        <Link href="/setup" className="btn btn-primary">
          Set up this iPhone first
        </Link>
      </div>
    );
  } else if (!memberId) {
    body = <p className="text-subhead text-muted">There are no check-ins you can see yet.</p>;
  } else if (error && status !== 403) {
    body = <ErrorNote message={error} onRetry={retry} />;
  } else if (!data || data.memberId !== memberId) {
    // useJson keeps the previous person's data while the next loads; never show it under the wrong name.
    body = <CardSkeleton lines={2} />;
  } else if (data.checkins.length === 0) {
    body = (
      <p className="flex items-center gap-2 text-subhead text-muted">
        <VideoIcon size={18} className="shrink-0" />
        No check-ins yet. FaceTime iCare to start one.
      </p>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3">
        {data.checkins.map((c) => (
          <li key={c.id} className="rounded-2xl bg-surface-muted p-4">
            {c.emergency && (
              <p role="alert" className="mb-3 flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-subhead font-semibold text-danger">
                <WarningIcon size={18} className="shrink-0" />
                Emergency symptoms mentioned: call 911
              </p>
            )}
            <p className="text-subhead font-semibold">{formatWhen(c.startedAt)}</p>
            <p className="text-footnote text-secondary">
              {c.channel === "facetime" ? "FaceTime check-in" : "Check-in"} · {formatLength(c.startedAt, c.endedAt)}
            </p>
            <ul className="ml-5 mt-3 list-disc text-subhead">
              {c.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
            {c.nextStep && (
              <p className="mt-3 text-subhead">
                <span className="font-semibold">Suggested next step: </span>
                {c.nextStep}
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const ready = data && data.memberId === memberId;
  return (
    <Card
      title="Recent check-ins"
      subtitle="Summaries of FaceTime check-ins with iCare, newest first"
      action={me?.setUp && memberId ? refresh : undefined}
    >
      <div className="flex flex-col gap-4">
        {people.length > 1 && (
          <SegmentedControl
            ariaLabel="Whose check-ins"
            options={people.map((p) => ({
              value: p.account.memberId as string,
              label: p.self ? "You" : p.account.displayName.split(" ")[0],
            }))}
            value={memberId ?? ""}
            onChange={setSelected}
          />
        )}
        {body}
        {ready && data.source === "Tiger Data" && <SourceBadge source={data.source} queryMs={data.queryMs} />}
        {ready && data.disclaimer ? (
          <p role="note" className="flex gap-2.5 rounded-2xl bg-fill px-4 py-3.5 text-footnote text-secondary">
            <InfoIcon size={18} className="mt-px shrink-0 text-muted" />
            <span>{data.disclaimer}</span>
          </p>
        ) : (
          me?.setUp && memberId && <Disclaimer />
        )}
      </div>
    </Card>
  );
}
