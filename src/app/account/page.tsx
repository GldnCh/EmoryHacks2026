"use client";
// "My iCare": whose iPhone this is, connection requests, connected people (what each side sees), and
// connecting / disconnecting with clear warnings. Connecting is one-time and either side can undo it.
// Guardians (parents of a child, caregivers) can also manage sharing for the person they care for.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import ConfirmSheet from "@/components/ConfirmSheet";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { api, notifyAuthChanged, pretendAnotherIphone, useMe } from "@/components/useMe";
import type { Account, Level } from "@/lib/auth/types";

type LevelInfo = { label: string; description: string };
type Side = { level: Level; label: string; guardian: boolean } | null;
interface Connections {
  me: Account;
  levels: Record<Level, LevelInfo>;
  connected: { account: Account; theySee: Side; iSee: Side; relationship: string | null; canDisconnect: boolean }[];
  incoming: { id: number; from: Account; fromLevel: Level; fromLevelLabel: string; relationship: string | null }[];
  outgoing: { id: number; to: Account; fromLevel: Level; fromLevelLabel: string }[];
  canConnect: Account[];
}
type Sheet =
  | { kind: "connect"; to: Account; level: Level; relationship: string }
  | { kind: "accept"; id: number; from: Account; theirLevel: string; back: Level | "none" }
  | { kind: "decline"; id: number; from: Account }
  | { kind: "change"; who: Account; from: Level | null; to: Level }
  | { kind: "disconnect"; who: Account; theySee: Side; iSee: Side }
  | null;

const LEVEL_ORDER: Level[] = ["full", "summary", "basic"];
const first = (a: Account) => a.displayName.split(" ")[0];
// `relationship` describes ME relative to THEM (e.g. Jordan is Rosa's "son"), so flip it to describe them.
const INVERSE: Record<string, string> = {
  son: "mother", daughter: "mother", parent: "child", child: "parent", mother: "son", father: "son", spouse: "spouse",
  "daughter-in-law": "mother-in-law", "mother-in-law": "daughter-in-law", grandmother: "grandchild", grandchild: "grandmother", friend: "friend",
};
const theirRole = (rel: string | null) => (rel ? `Your ${INVERSE[rel] ?? rel}` : "Connected");

function sees(levels: Record<Level, LevelInfo>, level: Level | null) {
  return level ? `${levels[level].label}: ${levels[level].description}` : "Nothing. They won't see any of your health.";
}

export default function MyICarePage() {
  const router = useRouter();
  const { me } = useMe();
  const [data, setData] = useState<Connections | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState({ to: "", level: "basic" as Level, relationship: "" });

  const load = useCallback(async () => {
    try {
      setData(await api<Connections>("/api/connections"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (me && !me.setUp) router.replace("/setup");
    if (me?.setUp) load();
  }, [me, router, load]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setSheet(null);
      await load();
      notifyAuthChanged();
    } catch (e) {
      setErr((e as Error).message);
      setSheet(null);
    } finally {
      setBusy(false);
    }
  }

  if (!me?.setUp || !me.account || !data) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
        <PageHeader title="My iCare" />
        {err ? <ErrorNote message={err} /> : <CardSkeleton lines={5} />}
      </main>
    );
  }
  const L = data.levels;
  const caredFor = me.people.filter((p) => !p.self && p.guardian);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 sm:px-6">
      <PageHeader
        title="My iCare"
        leading={<Avatar id={me.account.id} name={me.account.displayName} size={44} />}
        subtitle={`This iPhone belongs to ${me.account.displayName}. Your health data comes from Apple Health, Fitness, Apple Watch and AirPods.`}
      />
      {err && <ErrorNote message={err} />}

      {data.incoming.length > 0 && (
        <Card title="Connection requests" subtitle="Someone wants to connect their iCare with yours.">
          <ul className="divide-y divide-[var(--border)]">
            {data.incoming.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar id={r.from.id} name={r.from.displayName} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-headline">{r.from.displayName}</span>
                  <span className="block text-footnote text-secondary">Will share with you: {r.fromLevelLabel}</span>
                </span>
                <button onClick={() => setSheet({ kind: "decline", id: r.id, from: r.from })} className="btn btn-secondary min-h-11 px-4">
                  Decline
                </button>
                <button onClick={() => setSheet({ kind: "accept", id: r.id, from: r.from, theirLevel: r.fromLevelLabel, back: "none" })} className="btn btn-primary min-h-11 px-4">
                  Review
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4" title="Connected" subtitle="People whose iCare is connected to yours. Either of you can change or end it any time.">
        {data.connected.length === 0 && <p className="text-subhead text-secondary">You&apos;re not connected with anyone yet.</p>}
        <ul className="divide-y divide-[var(--border)]">
          {data.connected.map((c) =>
            c.account ? (
              <li key={c.account.id} className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar id={c.account.id} name={c.account.displayName} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-headline">{c.account.displayName}</span>
                    <span className="block text-footnote text-secondary">{theirRole(c.relationship)}</span>
                  </span>
                  {c.iSee && c.account.memberId && (
                    <Link href={`/family/${c.account.memberId}`} className="btn btn-secondary min-h-11 px-3 text-[15px]">
                      Open {first(c.account)}&apos;s iCare
                    </Link>
                  )}
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-fill p-3">
                    <p className="text-caption text-secondary">You see</p>
                    <p className="text-subhead font-medium">{c.iSee ? `${c.iSee.label}${c.iSee.guardian ? " · Guardian" : ""}` : "Nothing"}</p>
                  </div>
                  <div className="rounded-2xl bg-fill p-3">
                    <p className="text-caption text-secondary">{first(c.account)} sees</p>
                    {c.theySee?.guardian ? (
                      <p className="text-subhead font-medium">{c.theySee.label} · Guardian</p>
                    ) : (
                      <select
                        aria-label={`What ${c.account.displayName} sees of you`}
                        value={c.theySee?.level ?? ""}
                        onChange={(e) => {
                          const to = e.target.value as Level;
                          if (to && c.account) setSheet({ kind: "change", who: c.account, from: c.theySee?.level ?? null, to });
                        }}
                        className="mt-0.5 min-h-10 w-full rounded-xl bg-surface px-2 text-subhead font-medium"
                      >
                        {!c.theySee && <option value="">Nothing</option>}
                        {LEVEL_ORDER.map((l) => (
                          <option key={l} value={l}>
                            {L[l].label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex justify-end">
                  {c.canDisconnect ? (
                    <button onClick={() => c.account && setSheet({ kind: "disconnect", who: c.account, theySee: c.theySee, iSee: c.iSee })} className="btn btn-tertiary min-h-11 px-2 text-[15px] text-[#d92d20]">
                      Disconnect…
                    </button>
                  ) : (
                    <span className="py-3 text-footnote text-secondary">{first(c.account)} is your guardian. Only a guardian can end this connection.</span>
                  )}
                </div>
              </li>
            ) : null,
          )}
        </ul>
      </Card>

      {data.outgoing.length > 0 && (
        <Card className="mt-4" title="Waiting for an answer">
          <ul className="divide-y divide-[var(--border)]">
            {data.outgoing.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Avatar id={r.to.id} name={r.to.displayName} size={36} />
                <span className="min-w-0 flex-1 text-subhead">
                  Request sent to <strong>{r.to.displayName}</strong> · you offered {r.fromLevelLabel}
                </span>
                <button onClick={() => run(() => api(`/api/connections/${r.id}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) }))} className="btn btn-tertiary min-h-11 px-2">
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.canConnect.length > 0 && (
        <Card className="mt-4" title="Connect with someone" subtitle="They'll get a request on their iPhone. Nothing is shared until they accept.">
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Person" value={pick.to} onChange={(e) => setPick({ ...pick, to: e.target.value })} className="min-h-11 rounded-xl bg-fill px-3 text-[15px]">
              <option value="">Choose someone…</option>
              {data.canConnect.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
            <select aria-label="What they can see of you" value={pick.level} onChange={(e) => setPick({ ...pick, level: e.target.value as Level })} className="min-h-11 rounded-xl bg-fill px-3 text-[15px]">
              {LEVEL_ORDER.map((l) => (
                <option key={l} value={l}>
                  They see: {L[l].label}
                </option>
              ))}
            </select>
            <input
              aria-label="They are your… (optional)"
              placeholder="They are your… (e.g. friend)"
              value={pick.relationship}
              onChange={(e) => setPick({ ...pick, relationship: e.target.value })}
              className="min-h-11 rounded-xl bg-fill px-3 text-[15px]"
            />
          </div>
          <button
            disabled={!pick.to}
            onClick={() => {
              const to = data.canConnect.find((a) => a.id === pick.to);
              if (to) setSheet({ kind: "connect", to, level: pick.level, relationship: pick.relationship });
            }}
            className="btn btn-primary mt-3 min-h-11 px-5 disabled:opacity-50"
          >
            Review request…
          </button>
        </Card>
      )}

      {caredFor.length > 0 && (
        <Card className="mt-4" title="People you care for" subtitle="As their guardian you can act for them and manage who sees their health.">
          <ul className="flex flex-wrap gap-2">
            {caredFor.map((p) => (
              <li key={p.account.id}>
                <Link href={`/family/${p.account.memberId ?? p.account.id}`} className="pressable flex min-h-11 items-center gap-2 rounded-full bg-fill py-1 pl-1 pr-3 text-[15px]">
                  <Avatar id={p.account.id} name={p.account.displayName} size={28} />
                  Open {first(p.account)}&apos;s iCare
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="mt-6 text-footnote text-secondary">
        Demo: fictional people. To show another family member&apos;s iPhone on this computer,{" "}
        <button
          className="text-brand underline"
          onClick={async () => {
            await pretendAnotherIphone();
            router.push("/setup?demo=1");
          }}
        >
          pretend to be another iPhone
        </button>
        .
      </p>

      {/* ---------- warning sheets ---------- */}
      <ConfirmSheet
        open={sheet?.kind === "connect"}
        title={sheet?.kind === "connect" ? `Connect with ${sheet.to.displayName}?` : ""}
        warning="Only connect with people you trust with your health information."
        details={
          sheet?.kind === "connect"
            ? [
                `${first(sheet.to)} gets a request on their iPhone. Nothing is shared until they accept.`,
                `If they accept, they'll see ${sees(L, sheet.level)}`,
                `They can choose whether to share their own health with you.`,
                `You or ${first(sheet.to)} can disconnect any time.`,
              ]
            : []
        }
        confirmLabel="Send request"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() =>
          sheet?.kind === "connect" &&
          run(async () => {
            await api("/api/connections", { method: "POST", body: JSON.stringify({ toId: sheet.to.id, level: sheet.level, relationship: sheet.relationship || undefined }) });
            setPick({ to: "", level: "basic", relationship: "" });
          })
        }
      />

      <ConfirmSheet
        open={sheet?.kind === "accept"}
        title={sheet?.kind === "accept" ? `Connect with ${sheet.from.displayName}?` : ""}
        warning={sheet?.kind === "accept" ? `${first(sheet.from)} is sharing ${sheet.theirLevel} of their health with you.` : undefined}
        details={
          sheet?.kind === "accept"
            ? [
                sheet.back === "none" ? `${first(sheet.from)} won't see any of your health.` : `${first(sheet.from)} will see ${sees(L, sheet.back)}`,
                `You can change this or disconnect any time, and so can ${first(sheet.from)}.`,
              ]
            : []
        }
        confirmLabel="Accept"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() =>
          sheet?.kind === "accept" &&
          run(() => api(`/api/connections/${sheet.id}`, { method: "POST", body: JSON.stringify({ action: "accept", level: sheet.back === "none" ? null : sheet.back }) }))
        }
      >
        {sheet?.kind === "accept" && (
          <label className="mt-3 block text-subhead">
            <span className="mb-1 block font-medium">What can {first(sheet.from)} see of you?</span>
            <select value={sheet.back} onChange={(e) => setSheet({ ...sheet, back: e.target.value as Level | "none" })} className="min-h-11 w-full rounded-xl bg-fill px-3 text-[15px]">
              <option value="none">Nothing (just receive theirs)</option>
              {LEVEL_ORDER.map((l) => (
                <option key={l} value={l}>
                  {L[l].label}
                </option>
              ))}
            </select>
          </label>
        )}
      </ConfirmSheet>

      <ConfirmSheet
        open={sheet?.kind === "decline"}
        title={sheet?.kind === "decline" ? `Decline ${sheet.from.displayName}'s request?` : ""}
        details={sheet?.kind === "decline" ? [`Nothing will be shared either way.`, `${first(sheet.from)} can send a new request later.`] : []}
        confirmLabel="Decline"
        destructive
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() => sheet?.kind === "decline" && run(() => api(`/api/connections/${sheet.id}`, { method: "POST", body: JSON.stringify({ action: "decline" }) }))}
      />

      <ConfirmSheet
        open={sheet?.kind === "change"}
        title={sheet?.kind === "change" ? `Change what ${first(sheet.who)} sees?` : ""}
        warning={
          sheet?.kind === "change" && sheet.from && LEVEL_ORDER.indexOf(sheet.to) < LEVEL_ORDER.indexOf(sheet.from)
            ? `${first(sheet.who)} will be able to see more of your health.`
            : undefined
        }
        details={sheet?.kind === "change" ? [`From: ${sheet.from ? L[sheet.from].label : "Nothing"}`, `To: ${sees(L, sheet.to)}`] : []}
        confirmLabel="Change"
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() => sheet?.kind === "change" && run(() => api("/api/sharing", { method: "POST", body: JSON.stringify({ viewerId: sheet.who.id, level: sheet.to }) }))}
      />

      <ConfirmSheet
        open={sheet?.kind === "disconnect"}
        title={sheet?.kind === "disconnect" ? `Disconnect from ${sheet.who.displayName}?` : ""}
        warning="This ends the connection for both of you. It can't be undone; you'd need to send a new request to reconnect."
        details={
          sheet?.kind === "disconnect"
            ? [
                sheet.theySee ? `${first(sheet.who)} will no longer see your health (${sheet.theySee.label}).` : `${first(sheet.who)} doesn't see your health now.`,
                sheet.iSee ? `You will no longer see ${first(sheet.who)}'s health (${sheet.iSee.label}).` : `You don't see ${first(sheet.who)}'s health now.`,
                `Anything already saved stays in each person's own iCare.`,
              ]
            : []
        }
        confirmLabel="Disconnect"
        destructive
        busy={busy}
        onCancel={() => setSheet(null)}
        onConfirm={() => sheet?.kind === "disconnect" && run(() => api(`/api/connections?with=${encodeURIComponent(sheet.who.id)}`, { method: "DELETE" }))}
      />
    </main>
  );
}
