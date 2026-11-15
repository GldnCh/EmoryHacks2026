"use client";
// One-time setup: "Whose iPhone is this?" The native iCare app would know this from the iPhone and read health
// data from Apple Health (Fitness, Apple Watch, AirPods). The web demo asks once, then always opens straight to
// your iCare: no sign-in, nothing expires.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { useJson } from "@/components/useJson";
import { setUpDevice, useMe } from "@/components/useMe";
import type { Account } from "@/lib/auth/types";

const KIND_LABEL: Record<Account["kind"], string> = { adult: "Adult", child: "Child (parents are guardians)", elder: "Cared-for parent" };
const SOURCES = ["Apple Health", "Fitness", "Apple Watch", "AirPods"];

function Setup() {
  const router = useRouter();
  const sp = useSearchParams();
  const demoSwitch = sp.get("demo") === "1";
  const { me } = useMe();
  const { data, error, loading } = useJson<{ accounts: Account[] }>("/api/auth/accounts");
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  async function choose(id: string) {
    setBusy(id);
    setFail(null);
    try {
      await setUpDevice(id, demoSwitch);
      router.push("/dashboard");
    } catch (e) {
      setFail((e as Error).message);
      setBusy(null);
    }
  }

  if (me?.setUp && me.account && !demoSwitch) {
    return (
      <main className="mx-auto max-w-xl pb-4">
        <PageHeader title="All set" subtitle={`This iPhone belongs to ${me.account.displayName}. iCare opens straight to your health.`} />
        <button onClick={() => router.push("/dashboard")} className="btn btn-primary min-h-12 px-5">
          Open my iCare
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl pb-4">
      <PageHeader
        eyebrow={demoSwitch ? "Demo · pretend to be another iPhone" : "Welcome to iCare"}
        title="Whose iPhone is this?"
        subtitle="You only do this once. After that, iCare opens straight to your health: no sign-in, nothing to remember."
      />

      <Card>
        {loading && <CardSkeleton lines={5} />}
        {error && <ErrorNote message={error} />}
        {fail && <ErrorNote message={fail} />}
        {data && (
          <ul className="-mx-2">
            {data.accounts.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => choose(a.id)}
                  disabled={busy !== null}
                  className="pressable flex w-full min-h-14 items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-fill disabled:opacity-60"
                >
                  <Avatar id={a.id} name={a.displayName} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-headline">{a.displayName}&apos;s iPhone</span>
                    <span className="block text-footnote text-secondary">{KIND_LABEL[a.kind]}</span>
                  </span>
                  <span className="text-footnote text-brand">{busy === a.id ? "Setting up…" : "This is mine"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-4" title="Works with what you already use" subtitle="The iPhone app reads your data from Apple Health. In this demo, the data is a fictional family's.">
        <ul className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <li key={s} className="rounded-full bg-fill px-3 py-1.5 text-subhead">
              {s}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 text-footnote text-secondary">Demo only: fictional people, no real Apple IDs, no real health data.</p>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <Setup />
    </Suspense>
  );
}
