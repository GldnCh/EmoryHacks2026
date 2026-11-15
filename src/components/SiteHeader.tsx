"use client";
// iOS-style navigation (TD).
// Phones: a translucent top bar (back button or logo, plus the page title once the large title scrolls away)
// and an iOS tab bar along the bottom edge (icon over label, tint color for the current tab, hairline on top).
// Larger screens: the logo plus the tabs as an iOS segmented control.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, DatabaseIcon, PeopleIcon, PillIcon, StethoscopeIcon, VideoIcon } from "@/components/Icons";
import { useNav } from "@/components/navStore";
import AccountButton from "@/components/AccountButton";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: PeopleIcon },
  { href: "/checkin", label: "Check-in", Icon: VideoIcon },
  { href: "/medicines", label: "Medicines", Icon: PillIcon },
  { href: "/specialists", label: "Specialists", Icon: StethoscopeIcon },
  { href: "/data", label: "Tiger Data", Icon: DatabaseIcon },
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`) || (href === "/dashboard" && path.startsWith("/family"));
}

function Logo() {
  return (
    <Link href="/" className="pressable flex min-h-11 items-center gap-2 rounded-xl text-headline">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-b from-[#16a3a1] to-brand text-white shadow-sm">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.5 2h3v4.5H14v3H9.5V14h-3V9.5H2v-3h4.5Z" />
        </svg>
      </span>
      iCare
    </Link>
  );
}

export default function SiteHeader() {
  const path = usePathname();
  const nav = useNav();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow] duration-300 ${
          scrolled ? "bar shadow-[0_0.5px_0_var(--separator)]" : "bg-background"
        }`}
      >
        <div className="mx-auto grid h-[52px] max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-16 sm:px-6">
          {/* Left: back button on phones when the page has one, otherwise the logo */}
          <div className="flex min-w-0 items-center">
            {nav.back ? (
              <>
                <Link href={nav.back.href} className="pressable -ml-2 flex min-h-11 items-center gap-0.5 pr-2 text-[17px] text-brand sm:hidden">
                  <ChevronLeft size={24} />
                  <span className="truncate">{nav.back.label}</span>
                </Link>
                <span className="hidden sm:block">
                  <Logo />
                </span>
              </>
            ) : (
              <Logo />
            )}
          </div>

          {/* Center: small title on phones, floating tab pill on larger screens */}
          <p
            aria-hidden={!nav.titleHidden}
            className={`max-w-[50vw] truncate text-headline transition-all duration-300 sm:hidden ${
              nav.title && nav.titleHidden ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            {nav.title}
          </p>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="segment-track flex gap-0.5">
              {NAV.map(({ href, label }) => {
                const current = isCurrent(path, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={`flex min-h-10 items-center rounded-[7px] px-3 text-[14px] md:px-4 ${
                        current ? "segment-on font-semibold text-foreground" : "font-medium text-secondary hover:text-foreground"
                      }`}
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex justify-end">
            <AccountButton />
          </div>
        </div>
      </header>

      {/* Tab bar (phones only): full width along the bottom, like the Health app's Summary / Sharing / Browse */}
      <nav aria-label="Main" className="bar fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] shadow-[0_-0.5px_0_var(--separator)] sm:hidden">
        <ul className="grid grid-cols-5">
          {NAV.map(({ href, label, Icon }) => {
            const current = isCurrent(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 pt-1 text-[10.5px] font-medium ${
                    current ? "text-brand" : "text-[#6c6c70]"
                  }`}
                >
                  <Icon size={25} strokeWidth={current ? 2.3 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
