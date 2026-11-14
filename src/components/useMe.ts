"use client";
// Who is using iCare on this device (client-side). Re-fetches when anyone signs in/out or switches (iCare:auth event).
import { useCallback, useEffect, useState } from "react";
import type { Account, Capability, Level } from "@/lib/auth/types";

export interface MePerson {
  account: Account;
  self: boolean;
  level: Level | "self";
  levelLabel: string;
  relationship: string | null;
  guardian: boolean;
  capabilities: Capability[];
}
export interface Me {
  signedIn: boolean;
  account: Account | null;
  deviceAccounts: Account[];
  people: MePerson[];
}

export const AUTH_EVENT = "icare:auth";
export const notifyAuthChanged = () => window.dispatchEvent(new Event(AUTH_EVENT));

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      setMe(await res.json());
    } catch {
      setMe({ signedIn: false, account: null, deviceAccounts: [], people: [] });
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(AUTH_EVENT, load);
    return () => window.removeEventListener(AUTH_EVENT, load);
  }, [load]);
  return { me, reload: load };
}

export async function signInAs(accountId: string) {
  const res = await fetch("/api/auth/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId }) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't sign in.");
  notifyAuthChanged();
}

export async function signOut() {
  await fetch("/api/auth/signout", { method: "POST" });
  notifyAuthChanged();
}
