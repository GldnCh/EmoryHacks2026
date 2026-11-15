"use client";
// iOS-style large title for the top of each screen. Tells the nav bar the page title (shown small once
// this scrolls away) and an optional back link (shown in the nav bar on phones, above the title on larger screens).
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft } from "@/components/Icons";
import { resetNav, setNav } from "@/components/navStore";

interface PageHeaderProps {
  title?: string;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  /** Shown just before the title, e.g. an avatar. */
  leading?: ReactNode;
  children?: ReactNode;
}

export default function PageHeader({ title, eyebrow, subtitle, back, leading, children }: PageHeaderProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setNav({ title, back });
  }, [title, back?.href, back?.label]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => resetNav(), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 52px = height of the top bar, so the title "hands off" as it slides under it
    const io = new IntersectionObserver(([e]) => setNav({ titleHidden: !e.isIntersecting }), { rootMargin: "-52px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [title]);

  return (
    <header className="flex flex-col gap-1 pt-1">
      {back && (
        <Link href={back.href} className="btn btn-tertiary -ml-3 hidden self-start px-3 sm:inline-flex">
          <ChevronLeft size={18} />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="text-footnote font-semibold text-brand">{eyebrow}</p>}
      <div className="flex items-center gap-3">
        {leading}
        {title ? (
          <h1 ref={ref} className="text-large-title">
            {title}
          </h1>
        ) : (
          <div aria-hidden className="shimmer h-10 w-48 rounded-xl" />
        )}
      </div>
      {subtitle && <p className="max-w-2xl text-subhead text-secondary">{subtitle}</p>}
      {children}
    </header>
  );
}
