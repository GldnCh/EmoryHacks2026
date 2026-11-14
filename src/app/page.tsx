"use client";
// Landing page (TD): pitch, three feature tiles, and the fictional Rivera family.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Disclaimer from "@/components/Disclaimer";
import { ChevronRight, PeopleIcon, PillIcon, StethoscopeIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { ErrorNote, Skeleton } from "@/components/Status";
import { RELATIONSHIP, type Member } from "@/components/types";
import { useJson } from "@/components/useJson";

const FEATURES = [
  {
    href: "/dashboard",
    title: "Family health dashboard",
    text: "A year of Apple Health-style trends for everyone in the family, including relatives far away.",
    Icon: PeopleIcon,
    tint: "from-[#2fb5b2] to-[#0e7c7b]",
  },
  {
    href: "/medicines",
    title: "Medicine search",
    text: "Look up a medicine by name, brand or what it's for, with FDA and MedlinePlus information.",
    Icon: PillIcon,
    tint: "from-[#6aa8f0] to-[#2a6fd0]",
  },
  {
    href: "/specialists",
    title: "Find specialists",
    text: "Find the right kind of specialist near each family member, from the public NPI Registry.",
    Icon: StethoscopeIcon,
    tint: "from-[#b28af0] to-[#7148cf]",
  },
];

export default function Home() {
  const { data, error, loading, retry } = useJson<{ family: Member[] }>("/api/sample/family");

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Emory Hacks 2026 · Healthcare"
        title="IDoc"
        subtitle="Your family's health in one place, with AI check-ins that help you know when to see a doctor."
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary">
            Open family dashboard
          </Link>
          <Link href="/data" className="btn btn-secondary">
            See how the data works
          </Link>
        </div>
      </PageHeader>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="mb-3 px-1 text-title2">
          What IDoc does
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURES.map(({ href, title, text, Icon, tint }) => (
            <li key={href}>
              <Link
                href={href}
                className="card pressable group flex h-full items-start gap-4 p-5 hover:shadow-raised sm:flex-col sm:gap-3"
              >
                <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-gradient-to-b text-white shadow-sm ${tint}`}>
                  <Icon size={24} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-headline">
                    {title}
                    <ChevronRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-subhead text-secondary">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="family-heading">
        <div className="mb-3 px-1">
          <h2 id="family-heading" className="text-title2">
            Meet the Rivera family
          </h2>
          <p className="mt-0.5 text-subhead text-secondary">A fictional family. All of their health data is made up for the demo.</p>
        </div>
        {error ? (
          <ErrorNote message={error} onRetry={retry} />
        ) : (
          <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0">
            {loading && !data
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="w-44 shrink-0 sm:w-auto">
                    <Skeleton className="h-40 w-full rounded-[20px]" />
                  </li>
                ))
              : data?.family.map((m) => (
                  <li key={m.id} className="w-44 shrink-0 snap-start sm:w-auto">
                    <Link
                      href={`/family/${m.id}`}
                      className="card pressable flex h-full flex-col items-center p-5 text-center hover:shadow-raised"
                    >
                      <Avatar id={m.id} name={m.name} size={60} />
                      <p className="mt-3 text-headline">{m.name.split(" ")[0]}</p>
                      <p className="text-footnote text-secondary">
                        {RELATIONSHIP[m.relationship]} · {m.age} · {m.location.city}
                      </p>
                      <p className="mt-2 text-caption text-muted">{m.conditions.join(", ") || "No conditions on file"}</p>
                    </Link>
                  </li>
                ))}
          </ul>
        )}
      </section>

      <Disclaimer />
    </div>
  );
}
