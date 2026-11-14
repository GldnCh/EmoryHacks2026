"use client";
// Account: who is using iCare on this device, quick switching, and Family Sharing with adjustable permission
// levels (Full / Health summary / Basic). Guardians (parents, caregivers) can manage sharing for the people
// they care for, like Apple Family Sharing's parental controls.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { notifyAuthChanged, signInAs, signOut, useMe } from "@/components/useMe";
import type { Account, Level, SharingGrant } from "@/lib/auth/types";

type SharingData = {
  subject: Account;
  levels: Record<Level, { label: string; description: string }>;
  seenBy: (SharingGrant & { viewerName: string })[];
  canAdd: Account[];
};

const LEVEL_ORDER: Level[] = ["full", "summary", "basic"];

// `relationship` describes the VIEWER (e.g. Jordan is Rosa's "son"); show it from the viewer's side ("Your mother").
const INVERSE: Record<string, string> = {
  son: "mother", daughter: "mother", parent: "child", child: "parent", mother: "son", father: "son",
  "daughter-in-law": "mother-in-law", "son-in-law": "mother-in-law", spouse: "spouse", partner: "partner", friend: "friend",
};
const theirRole = (rel: string | null) => (rel ? `Your ${INVERSE[rel] ?? rel}` : "");

function LevelBadge({ label, guardian }: { label: string; guardian?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-medium text-brand">
      {label}
      {guardian && " · Guardian"}
    </span>
  );
}

function Sharing({ subjectId, isSelf }: { subjectId: string; isSelf: boolean }) {
  const [data, setData] = useState<SharingData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  const [addLevel, setAddLevel] = useState<Level>("basic");
  const qs = isSelf ? "" : `?subjectId=${encodeURIComponent(subjectId)}`;

  async function load() {
    setErr(null);
    const res = await fetch(`/api/sharing${qs}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) return setErr(json.error ?? "Couldn't load sharing.");
    setData(json);
  }
  useEffect(() => {
    load();
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(viewerId: string, level: Level, guardian = false) {
    const res = await fetch("/api/sharing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subjectId, viewerId, level, guardian }),
    });
    if (!res.ok) setErr((await res.json()).error ?? "Couldn't save.");
    await load();
    notifyAuthChanged();
  }
  async function remove(viewerId: string) {
    const res = await fetch(`/api/sharing?subjectId=${encodeURIComponent(subjectId)}&viewerId=${encodeURIComponent(viewerId)}`, { method: "DELETE" });
    if (!res.ok) setErr((await res.json()).error ?? "Couldn't remove.");
    await load();
    notifyAuthChanged();
  }

  if (!data) return err ? <ErrorNote message={err} /> : <CardSkeleton lines={3} />;
  const name = data.subject.displayName.split(" ")[0];
  return (
    <div>
      {err && <ErrorNote message={err} />}
      {data.seenBy.length === 0 && <p className="text-subhead text-secondary">Nobody else can see {isSelf ? "your" : `${name}'s`} health yet.</p>}
      <ul className="divide-y divide-[var(--border)]">
        {data.seenBy.map((g) => (
          <li key={g.viewerId} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar id={g.viewerId} name={g.viewerName} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block text-headline">{g.viewerName}</span>
              <span className="block text-footnote text-secondary">{g.relationship ?? "—"}</span>
            </span>
            {g.guardian ? (
              <LevelBadge label={data.levels[g.level].label} guardian />
            ) : (
              <select
                aria-label={`What ${g.viewerName} can see`}
                value={g.level}
                onChange={(e) => save(g.viewerId, e.target.value as Level)}
                className="min-h-11 rounded-xl bg-fill px-3 text-[15px]"
              >
                {LEVEL_ORDER.map((l) => (
                  <option key={l} value={l}>
                    {data.levels[l].label}
                  </option>
                ))}
              </select>
            )}
            <button onClick={() => remove(g.viewerId)} className="btn btn-tertiary min-h-11 px-2 text-[15px]">
              Remove
            </button>
          </li>
        ))}
      </ul>

      {data.canAdd.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-fill p-3">
          <span className="text-subhead font-medium">Share with</span>
          <select aria-label="Person" value={addId} onChange={(e) => setAddId(e.target.value)} className="min-h-11 rounded-xl bg-surface px-3 text-[15px]">
            <option value="">Choose someone…</option>
            {data.canAdd.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
          <select aria-label="Level" value={addLevel} onChange={(e) => setAddLevel(e.target.value as Level)} className="min-h-11 rounded-xl bg-surface px-3 text-[15px]">
            {LEVEL_ORDER.map((l) => (
              <option key={l} value={l}>
                {data.levels[l].label}
              </option>
            ))}
          </select>
          <button disabled={!addId} onClick={() => save(addId, addLevel).then(() => setAddId(""))} className="btn btn-primary min-h-11 px-4 disabled:opacity-50">
            Add
          </button>
        </div>
      )}

      <details className="mt-3 text-footnote text-secondary">
        <summary className="cursor-pointer">What each level can see</summary>
        <ul className="mt-2 space-y-1">
          {LEVEL_ORDER.map((l) => (
            <li key={l}>
              <strong>{data.levels[l].label}:</strong> {data.levels[l].description}
            </li>
          ))}
          <li>
            <strong>Guardian:</strong> Full access, plus can act for them and manage their sharing (parents of a child, caregivers).
          </li>
        </ul>
      </details>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { me } = useMe();
  const [manage, setManage] = useState<string | null>(null);

  useEffect(() => {
    if (me && !me.signedIn) router.replace("/signin?next=/account");
  }, [me, router]);

  if (!me?.signedIn || !me.account) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
        <PageHeader title="Account" />
        <CardSkeleton lines={4} />
      </main>
    );
  }
  const acc = me.account;
  const others = me.people.filter((p) => !p.self);
  const caredFor = others.filter((p) => p.guardian);
  const subjectId = manage ?? acc.id;
  const subject = manage ? others.find((p) => p.account.id === manage)?.account : acc;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
      <PageHeader title="Account" leading={<Avatar id={acc.id} name={acc.displayName} size={44} />} subtitle={`Using iCare as ${acc.displayName}`} />

      <Card
        title="This device"
        subtitle="Anyone in the family can use this phone as themselves. What they do is saved to their own account."
        action={
          <button
            onClick={async () => {
              await signOut();
              router.push("/signin");
            }}
            className="btn btn-tertiary min-h-11 px-2"
          >
            Sign out
          </button>
        }
      >
        <ul className="flex flex-wrap gap-2">
          {me.deviceAccounts.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => signInAs(a.id)}
                disabled={a.id === acc.id}
                className={`pressable flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-3 ${a.id === acc.id ? "bg-brand-soft" : "bg-fill"}`}
              >
                <Avatar id={a.id} name={a.displayName} size={28} />
                <span className="text-[15px]">{a.id === acc.id ? `${a.displayName.split(" ")[0]} (now)` : `Use as ${a.displayName.split(" ")[0]}`}</span>
              </button>
            </li>
          ))}
          <li>
            <Link href="/signin?next=/account" className="pressable flex min-h-11 items-center rounded-full bg-fill px-4 text-[15px] text-brand">
              + Someone else
            </Link>
          </li>
        </ul>
      </Card>

      <Card className="mt-4" title="People you can see" subtitle="Shared with you by them, or because you care for them.">
        {others.length === 0 ? (
          <p className="text-subhead text-secondary">Nobody has shared their health with you yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {others.map((p) => (
              <li key={p.account.id} className="flex items-center gap-3 py-3">
                <Avatar id={p.account.id} name={p.account.displayName} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block text-headline">{p.account.displayName}</span>
                  <span className="block text-footnote text-secondary">{theirRole(p.relationship)}</span>
                </span>
                <LevelBadge label={p.levelLabel} guardian={p.guardian} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        className="mt-4"
        title={manage ? `Who can see ${subject?.displayName.split(" ")[0]}'s health` : "Who can see your health"}
        subtitle={manage ? "You're their guardian, so you can manage this for them." : "You choose who sees what. Change it any time."}
        action={
          caredFor.length > 0 ? (
            <select aria-label="Manage sharing for" value={subjectId} onChange={(e) => setManage(e.target.value === acc.id ? null : e.target.value)} className="min-h-11 rounded-xl bg-fill px-3 text-[15px]">
              <option value={acc.id}>You</option>
              {caredFor.map((p) => (
                <option key={p.account.id} value={p.account.id}>
                  {p.account.displayName.split(" ")[0]}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        <Sharing key={subjectId} subjectId={subjectId} isSelf={!manage} />
      </Card>

      <p className="mt-4 text-footnote text-secondary">Demo accounts are fictional. Real Sign in with Apple would replace the demo sign-in.</p>
    </main>
  );
}
