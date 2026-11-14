"use client";
// Whose iPhone this is (client-side), who they can see, and how many connection requests are waiting.
// Re-fetches whenever connections change anywhere on the page (icare:auth event).
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
  setUp: boolean;
  account: Account | null;
  people: MePerson[];
  incomingRequests: number;
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
      setMe({ setUp: false, account: null, people: [], incomingRequests: 0 });
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(AUTH_EVENT, load);
    return () => window.removeEventListener(AUTH_EVENT, load);
  }, [load]);
  return { me, reload: load };
}

/** One-time "Whose iPhone is this?" setup. demoSwitch lets a presenter act as another family member's iPhone. */
export async function setUpDevice(accountId: string, demoSwitch = false) {
  const res = await fetch("/api/device", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountId, demoSwitch }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't set up this iPhone.");
  notifyAuthChanged();
}

/** Demo only: forget whose iPhone this is, so the presenter can show another person's phone. */
export async function pretendAnotherIphone() {
  await fetch("/api/device", { method: "DELETE" });
  notifyAuthChanged();
}

/** JSON fetch helper for the connection/sharing APIs: returns data or throws the server's error message. */
export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}
