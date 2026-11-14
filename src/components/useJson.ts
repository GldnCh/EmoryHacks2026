"use client";
// Fetch JSON from one of our API routes, with loading/error state.
// Keeps the previous data while a new URL loads, so charts don't flash empty.
import { useCallback, useEffect, useState } from "react";

export interface JsonState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** HTTP status of the last finished request (e.g. 404), or null before one finishes or on a network error. */
  status: number | null;
  retry: () => void;
}

export function useJson<T>(url: string | null): JsonState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [status, setStatus] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setStatus(null);
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!ctrl.signal.aborted) setStatus(res.status);
        if (!res.ok) throw new Error(body?.error ?? `The server answered ${res.status}.`);
        setData(body as T);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [url, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data, error, loading, status, retry };
}
