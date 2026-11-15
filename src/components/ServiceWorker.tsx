"use client";
// Registers /sw.js so iCare can be installed as an app (PWA). Production only: in `npm run dev`
// it removes any worker left over from `npm start`, since dev files aren't hashed and could go stale.
import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Not fatal: the site works the same without it.
    });
  }, []);
  return null;
}
