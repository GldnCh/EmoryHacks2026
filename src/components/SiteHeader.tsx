"use client";
// iOS-style navigation (TD).
// Phones: a translucent top bar (back button or logo, plus the page title once the large title scrolls away)
// and an iOS tab bar along the bottom edge (icon over label, tint color for the current tab, hairline on top).
// Larger screens: the logo plus the tabs as an iOS segmented control.
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, InfoIcon, PeopleIcon, PillIcon, StethoscopeIcon, VideoIcon } from "@/components/Icons";
import { useNav } from "@/components/navStore";
import AccountButton from "@/components/AccountButton";
import Portrait from "@/components/Portrait";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: PeopleIcon },
  { href: "/checkin", label: "Check-in", Icon: VideoIcon },
  { href: "/medicines", label: "Medicines", Icon: PillIcon },
  { href: "/specialists", label: "Specialists", Icon: StethoscopeIcon },
  { href: "/data", label: "Info", Icon: InfoIcon }, // the "Powered by Tiger Data" page and other details
];

function isCurrent(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`) || (href === "/dashboard" && path.startsWith("/family"));
}

function Logo() {
  return (
    <Link href="/" className="pressable flex min-h-11 items-center gap-2 rounded-xl text-headline">
      <BrandMark size={32} className="drop-shadow-sm" />
      iCare
    </Link>
  );
}

/**
 * Middle tab on phones: home (the family platform). On someone's profile it shows that person's portrait and name,
 * so you always know whose health you're looking at; tapping it takes you back home.
 */
function HomeTab({ path }: { path: string }) {
  const personId = path.match(/^\/family\/([a-z0-9-]+)/)?.[1];
  const current = path === "/" || path === "/dashboard" || Boolean(personId);
  const name = personId ? personId.charAt(0).toUpperCase() + personId.slice(1) : "Family";
  return (
    <Link
      href="/"
      aria-current={path === "/" ? "page" : undefined}
      aria-label={personId ? `Viewing ${name}. Go back to your family` : "Family home"}
      className={`flex min-h-[54px] flex-col items-center justify-center gap-0.5 pt-1 text-[10.5px] font-medium ${current ? "text-brand" : "text-[#6c6c70]"}`}
    >
      {personId ? (
        <span className="grid h-[27px] w-[27px] place-items-center overflow-hidden rounded-full bg-[var(--brand-soft)] ring-2 ring-[var(--brand)]">
          <Portrait id={personId} size={44} className="shrink-0" />
        </span>
      ) : (
        <PeopleIcon size={25} strokeWidth={current ? 2.3 : 1.8} />
      )}
      <span className="max-w-[64px] truncate">{name}</span>
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
              {/* no Dashboard tab: the logo takes you home to the family platform */}
              {NAV.slice(1).map(({ href, label }) => {
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
          {/* order: Check-in, Medicines, [Family / the person you're viewing], Specialists, Tiger Data */}
          {[NAV[1], NAV[2], null, NAV[3], NAV[4]].map((item) => {
            if (!item)
              return (
                <li key="home">
                  <HomeTab path={path} />
                </li>
              );
            const { href, label, Icon } = item;
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
