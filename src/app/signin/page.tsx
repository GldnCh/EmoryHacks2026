"use client";
// Sign in (demo stand-in for "Sign in with Apple"). Pick whose iCare this is. Accounts that already signed in on
// this device appear first, so a teenager can borrow Mom's phone and switch with one tap; everything they do is
// saved to their own account and shows up on their own phone too.
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { useJson } from "@/components/useJson";
import { signInAs, useMe } from "@/components/useMe";
import type { Account } from "@/lib/auth/types";

const KIND_LABEL: Record<Account["kind"], string> = { adult: "Adult", child: "Child account", elder: "Cared-for parent" };

function SignIn() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const { me } = useMe();
  const { data, error, loading } = useJson<{ accounts: Account[] }>("/api/auth/accounts");
  const [busy, setBusy] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);

  async function choose(id: string) {
    setBusy(id);
    setFail(null);
    try {
      await signInAs(id);
      router.push(safeNext);
    } catch (e) {
      setFail((e as Error).message);
      setBusy(null);
    }
  }

  const device = me?.deviceAccounts ?? [];
  const others = (data?.accounts ?? []).filter((a) => !device.some((d) => d.id === a.id));

  const row = (a: Account, hint: string) => (
    <li key={a.id}>
      <button
        onClick={() => choose(a.id)}
        disabled={busy !== null}
        className="pressable flex w-full min-h-14 items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-fill disabled:opacity-60"
      >
        <Avatar id={a.id} name={a.displayName} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block text-headline">{a.displayName}</span>
          <span className="block text-footnote text-secondary">{hint}</span>
        </span>
        <span className="text-footnote text-brand">{busy === a.id ? "Signing in…" : "Continue"}</span>
      </button>
    </li>
  );

  return (
    <main className="mx-auto max-w-xl px-4 pb-28 sm:px-6">
      <PageHeader title="Sign in" subtitle="Your iCare account knows it's you, like your Apple ID on your iPhone." />

      {device.length > 0 && (
        <Card title="On this device" subtitle="Tap to switch. Each person's data stays in their own account.">
          <ul className="-mx-2">{device.map((a) => row(a, me?.account?.id === a.id ? "Using iCare now" : "Signed in here before"))}</ul>
        </Card>
      )}

      <Card className="mt-4" title="Sign in with Apple (demo)" subtitle="Choose a demo account. The real app would use your Apple ID here.">
        {loading && <CardSkeleton lines={4} />}
        {error && <ErrorNote message={error} />}
        {fail && <ErrorNote message={fail} />}
        {data && <ul className="-mx-2">{others.map((a) => row(a, KIND_LABEL[a.kind]))}</ul>}
      </Card>

      <p className="mt-4 text-footnote text-secondary">
        Demo only: these are fictional people. No passwords, no real Apple IDs, no real health data.
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
