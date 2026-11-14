"use client";
// Top bar with the IDoc name and main nav. On phones the links scroll sideways in one row.
// Check-in (Ish), Medicines and Specialists (Jam) may 404 until their pull requests merge.
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/checkin", label: "Check-in" },
  { href: "/medicines", label: "Medicines" },
  { href: "/specialists", label: "Specialists" },
  { href: "/data", label: "Tiger Data" },
];

export default function SiteHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 pt-3 sm:flex-row sm:items-center sm:gap-6 sm:py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm text-white">
            +
          </span>
          IDoc
        </Link>
        <nav aria-label="Main" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-1 whitespace-nowrap pb-2 text-sm sm:pb-0">
            {NAV.map((item) => {
              const current = path === item.href || path.startsWith(`${item.href}/`) || (item.href === "/dashboard" && path.startsWith("/family"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-lg px-3 py-1.5 font-medium ${
                      current ? "bg-brand-soft text-brand" : "text-secondary hover:bg-surface-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
