"use client";
// Tiny shared state between a page's large title and the top nav bar (iOS pattern):
// the page registers its title and back link; the bar shows the small title once the large one scrolls away.
import { useSyncExternalStore } from "react";

export interface NavState {
  title?: string;
  /** true once the page's large title has scrolled out of view */
  titleHidden: boolean;
  back?: { href: string; label: string };
}

let state: NavState = { titleHidden: false };
const listeners = new Set<() => void>();
const SERVER_STATE: NavState = { titleHidden: false };

export function setNav(patch: Partial<NavState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function resetNav() {
  state = { titleHidden: false };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useNav(): NavState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
