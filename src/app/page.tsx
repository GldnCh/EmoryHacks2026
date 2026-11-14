"use client";
// Landing page (TD): pitch, three feature tiles, and the fictional Rivera family.
import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import { ErrorNote, Skeleton } from "@/components/Status";
import { RELATIONSHIP, type Member } from "@/components/types";
import { useJson } from "@/components/useJson";

const FEATURES = [
  {
    href: "/dashboard",
    title: "Family health dashboard",
    text: "A year of Apple Health-style trends for everyone in the family, including relatives far away.",
    icon: "♥",
  },
  {
    href: "/medicines",
    title: "Medicine search",
    text: "Look up a medicine by name, brand or what it's for, with FDA and MedlinePlus information.",
    icon: "℞",
  },
  {
    href: "/specialists",
    title: "Find specialists",
    text: "Find the right kind of specialist near each family member, from the public NPI Registry.",
    icon: "⌖",
  },
];

export default function Home() {
  const { data, error, loading, retry } = useJson<{ family: Member[] }>("/api/sample/family");

  return (
    <div className="flex flex-col gap-8">
      <section className="pt-2">
        <p className="text-sm font-semibold text-brand">Emory Hacks 2026 · Healthcare</p>
        <h1 className="mt-1 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Your family&apos;s health in one place, with AI check-ins that help you know when to see a doctor.
        </h1>
      </section>

      <section aria-label="Features" className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-brand"
          >
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-lg text-brand">
              {f.icon}
            </span>
            <h2 className="mt-3 font-semibold group-hover:text-brand">{f.title} →</h2>
            <p className="mt-1 text-sm text-secondary">{f.text}</p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="family-heading">
        <h2 id="family-heading" className="text-lg font-semibold">
          Meet the Rivera family
        </h2>
        <p className="mb-3 text-sm text-secondary">A fictional family. All of their health data is made up for the demo.</p>
        {error ? (
          <ErrorNote message={error} onRetry={retry} />
        ) : (
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            {loading && !data
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="w-56 shrink-0 sm:w-auto">
                    <Skeleton className="h-24 w-full" />
                  </li>
                ))
              : data?.family.map((m) => (
                  <li key={m.id} className="w-56 shrink-0 snap-start sm:w-auto">
                    <Link href={`/family/${m.id}`} className="block h-full rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-brand">
                      <p className="font-semibold">{m.name.split(" ")[0]}</p>
                      <p className="text-xs text-secondary">
                        {RELATIONSHIP[m.relationship]} · {m.age} · {m.location.city}
                      </p>
                      <p className="mt-2 text-xs text-muted">{m.conditions.join(", ") || "No conditions on file"}</p>
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
