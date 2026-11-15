"use client";
// iCare on Apple Watch (Cam). A small, glanceable view for the Watch's built-in web view (open a link to /watch
// from Messages or Mail on the Watch). Black background for the always-on display, big tap targets, and the same
// data and permissions as the app: the family at a glance, each person's alerts, and their next medicine.
// It covers the header and tab bar with a full-screen layer (FullScreen), so the rest of the app is unchanged.
import { useState } from "react";
import FullScreen from "@/components/FullScreen";
import Portrait from "@/components/Portrait";
import type { AlertsResponse, PersonAlerts, Status } from "@/components/FamilyAlerts";
import { useJson } from "@/components/useJson";
import { usePeople, type PersonWithHealth } from "@/components/usePeople";
import { setUpDevice } from "@/components/useMe";
import type { Account } from "@/lib/auth/types";

const LINE = process.env.NEXT_PUBLIC_CHERT_FACETIME_NUMBER || "+16282244223";

const TONE: Record<Status, { dot: string; text: string }> = {
  okay: { dot: "#34C759", text: "#7EE29B" },
  "check-in": { dot: "#FF9F0A", text: "#FFC266" },
  urgent: { dot: "#FF453A", text: "#FF8A80" },
};

interface Dose {
  medicine: string;
  label: string;
  time: string;
  scheduledFor: string;
  status: "taken" | "skipped" | "due" | "upcoming" | "missed";
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function NextDose({ memberId }: { memberId: string }) {
  const { data } = useJson<{ doses: Dose[] }>(`/api/reminders/${memberId}?days=2`);
  if (!data) return null;
  const next = data.doses.find((d) => d.status === "due") ?? data.doses.find((d) => d.status === "upcoming");
  if (!next) return null;
  return (
    <div className="mt-2 rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{next.status === "due" ? "Due now" : "Next medicine"}</p>
      <p className="text-[15px] font-semibold leading-tight">{next.medicine}</p>
      <p className="text-[13px] text-white/70">{clock(next.scheduledFor)}</p>
    </div>
  );
}

function Person({ p, alerts, open, onToggle }: { p: PersonWithHealth; alerts?: PersonAlerts; open: boolean; onToggle: () => void }) {
  const status: Status = alerts?.status ?? "okay";
  const tone = TONE[status];
  const first = p.member.name.split(" ")[0];
  return (
    <li className="rounded-[22px] bg-[#1C1C1E]">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full min-h-14 items-center gap-2.5 px-2.5 py-2 text-left active:opacity-70">
        <span className="shrink-0 overflow-hidden rounded-full bg-[#FFD7B5]">
          <Portrait id={p.member.id} size={40} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold leading-tight">{p.person.self ? `${first} (you)` : first}</span>
          <span className="flex items-start gap-1 text-[13px] leading-tight" style={{ color: tone.text }}>
            <span aria-hidden className="mt-[3px] h-2 w-2 shrink-0 rounded-full" style={{ background: tone.dot }} />
            <span className="line-clamp-2">{alerts?.statusText ?? "Doing okay"}</span>
          </span>
        </span>
      </button>
      {open && (
        <div className="px-2.5 pb-3">
          {alerts && alerts.alerts.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {alerts.alerts.slice(0, 2).map((a) => (
                <li key={a.id} className="rounded-2xl px-3 py-2 text-[14px] font-medium leading-snug" style={{ background: a.severity === "urgent" ? "rgba(255,69,58,.22)" : "rgba(255,159,10,.2)" }}>
                  {a.title}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-1 text-[13px] text-white/60">No alerts.</p>
          )}
          {p.can("reminders") && <NextDose memberId={p.member.id} />}
        </div>
      )}
    </li>
  );
}

function WhoseWatch() {
  const { data } = useJson<{ accounts: Account[] }>("/api/auth/accounts");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <>
      <h1 className="text-[18px] font-bold leading-tight">Whose watch is this?</h1>
      <p className="mt-1 text-[13px] text-white/60">You only do this once.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {data?.accounts.map((a) => (
          <li key={a.id}>
            <button
              disabled={busy !== null}
              onClick={async () => {
                setBusy(a.id);
                try {
                  await setUpDevice(a.id);
                } catch {
                  setBusy(null);
                }
              }}
              className="flex w-full min-h-12 items-center rounded-full bg-[#1C1C1E] px-4 text-[16px] font-semibold active:opacity-70 disabled:opacity-50"
            >
              {busy === a.id ? "Setting up…" : a.displayName}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function WatchApp() {
  const { me, people } = usePeople();
  const alerts = useJson<AlertsResponse>(me?.setUp ? "/api/alerts" : null);
  const [open, setOpen] = useState<string | null>(null);
  const byAccount = new Map((alerts.data?.people ?? []).map((a) => [a.accountId, a]));
  // People who need a look come first.
  const rank: Record<Status, number> = { urgent: 0, "check-in": 1, okay: 2 };
  const sorted = [...(people ?? [])].sort(
    (a, b) => rank[byAccount.get(a.person.account.id)?.status ?? "okay"] - rank[byAccount.get(b.person.account.id)?.status ?? "okay"],
  );

  return (
    <FullScreen className="bg-black text-white antialiased [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto max-w-[240px] px-2 pb-6 pt-[max(8px,env(safe-area-inset-top))]">
        <p className="flex items-center gap-1.5 px-1 text-[13px] font-semibold text-[#FFB27A]">
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21Z" />
          </svg>
          iCare
        </p>

        {me && !me.setUp ? (
          <div className="mt-2 px-1">
            <WhoseWatch />
          </div>
        ) : (
          <>
            <h1 className="mt-1 px-1 text-[20px] font-bold leading-tight">Family</h1>
            {!people ? (
              <p className="mt-3 px-1 text-[13px] text-white/60">Loading…</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {sorted.map((p) => (
                  <Person
                    key={p.person.account.id}
                    p={p}
                    alerts={byAccount.get(p.person.account.id)}
                    open={open === p.person.account.id}
                    onToggle={() => setOpen(open === p.person.account.id ? null : p.person.account.id)}
                  />
                ))}
              </ul>
            )}
            <a
              href={`facetime-audio:${LINE}`}
              className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B84A14] text-[16px] font-semibold active:opacity-80"
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1Z" />
              </svg>
              Check in with iCare
            </a>
          </>
        )}
        <p className="mt-3 px-1 text-center text-[11px] leading-snug text-white/45">Not medical advice. Emergency: call 911.</p>
      </div>
    </FullScreen>
  );
}
