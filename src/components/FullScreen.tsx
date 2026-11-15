"use client";
// A full-screen layer above the header and tab bar (Cam), for pages that need the whole screen: the Apple Watch
// view and the device previews. Rendered into <body> with a portal because the page-transition wrapper
// (template.tsx) uses a transform, which would otherwise trap position:fixed inside the page.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function FullScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(<div className={`fixed inset-0 z-[60] overflow-y-auto ${className}`}>{children}</div>, document.body);
}
