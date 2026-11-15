"use client";
// Landing page (TD; warm redesign by Cam): logo + pitch, buttons straight into the demo, six feature tiles,
// "designed for iPhone" note, and the fictional Rivera family.
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BrandMark from "@/components/BrandMark";
import Disclaimer from "@/components/Disclaimer";
import { ArchiveIcon, CalendarIcon, ChevronRight, PeopleIcon, PillIcon, StethoscopeIcon, VideoIcon } from "@/components/Icons";
import { ErrorNote, Skeleton } from "@/components/Status";
import { RELATIONSHIP, type Member } from "@/components/types";
import { useJson } from "@/components/useJson";

const FEATURES = [
  {
    href: "/checkin#facetime",
    title: "FaceTime check-in",
    text: "FaceTime iCare from an iPhone, or chat here. A friendly AI check-in about sleep, energy, pain, mood and medicines.",
    Icon: VideoIcon,
    tint: "from-[#FFC46B] to-[#F2683A]",
  },
  {
    href: "/dashboard",
    title: "Family dashboard",
    text: "A year of Apple Health-style trends for you and the people you're connected to, at the level each one shares.",
    Icon: PeopleIcon,
    tint: "from-[#FF9F7A] to-[#E5533F]",
  },
  {
    href: "/family/rosa",
    title: "Reminders & alerts",
    text: "Medicine reminders with a one-tap Taken button, and alerts when someone misses doses or needs a call.",
    Icon: CalendarIcon,
    tint: "from-[#FFD27A] to-[#F59A3A]",
  },
  {
    href: "/family/rosa/report",
    title: "Doctor report",
    text: "One printable page for the next visit, with questions to ask the doctor written from real numbers.",
    Icon: ArchiveIcon,
    tint: "from-[#FFB3A0] to-[#E8664F]",
  },
  {
    href: "/medicines",
    title: "Medicine search",
    text: "Search by name, brand, symptom, voice or a photo of the label, with official FDA warnings first.",
    Icon: PillIcon,
    tint: "from-[#6aa8f0] to-[#2a6fd0]",
  },
  {
    href: "/specialists",
    title: "Find specialists",
    text: "The right kind of doctor near each family member, from the national NPI Registry.",
    Icon: StethoscopeIcon,
    tint: "from-[#b28af0] to-[#7148cf]",
  },
];

const WORKS_WITH = ["Apple Health", "Fitness", "Apple Watch", "AirPods"];

export default function Home() {
  const { data, error, loading, retry } = useJson<{ family: Member[] }>("/api/sample/family");

  return (
    <div className="flex flex-col gap-10">
      {/* Hero: the logo, the promise, and the way into the demo */}
      <section className="card relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12" aria-labelledby="hero-title">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 260px at 0% 0%, rgba(255, 210, 140, 0.45), transparent 70%), radial-gradient(420px 240px at 100% 100%, rgba(255, 150, 110, 0.22), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
          <BrandMark size={112} className="shrink-0 drop-shadow-[0_10px_18px_rgba(190,80,25,0.28)]" title="iCare" />
          <div className="min-w-0">
            <p className="text-footnote font-semibold uppercase tracking-wide text-brand">iCare · Emory Hacks 2026 · Healthcare</p>
            <h1 id="hero-title" className="mt-1 text-large-title sm:text-[44px] sm:leading-[1.1]">
              Your family&apos;s health, explained.
            </h1>
            <p className="mt-3 max-w-xl text-subhead text-secondary sm:text-[17px]">
              One warm place for the whole family: trends from your watch, friendly AI check-ins by FaceTime, medicine help, and a gentle
              heads-up when someone you love needs a call.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn btn-primary">
                Open family dashboard
              </Link>
              <Link href="/checkin#facetime" className="btn btn-secondary">
                <VideoIcon size={18} />
                FaceTime iCare
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-footnote text-muted">Designed for iPhone, alongside</span>
              {WORKS_WITH.map((name) => (
                <span key={name} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-footnote font-medium text-secondary">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="mb-3 px-1 text-title2">
          What iCare does
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {FEATURES.map(({ href, title, text, Icon, tint }) => (
            <li key={href}>
              <Link
                href={href}
                className="card pressable group flex h-full items-start gap-4 p-5 hover:shadow-raised sm:flex-col sm:gap-3"
              >
                <span
                  aria-hidden
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br text-white shadow-[0_4px_12px_rgba(200,90,30,0.18)] ${tint}`}
                >
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
