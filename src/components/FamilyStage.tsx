"use client";
// The home screen (Cam): your family standing on a warm "lazy susan" platform over layered, textured artwork.
// Swipe, drag, use the arrows or the keyboard to turn the platform (with an iOS-like spring); the person in front is
// a portal into their health page. Phones: full screen. Larger screens: text and card on the left, stage on the right.
// Shows you + the people you're connected to; before setup, the demo family with a "Whose iPhone is this?" prompt.
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import Portrait from "@/components/Portrait";
import WarmArt from "@/components/WarmArt";
import { StatusPill, type AlertsResponse } from "@/components/FamilyAlerts";
import { RELATIONSHIP, type Member } from "@/components/types";
import { useJson } from "@/components/useJson";
import { usePeople } from "@/components/usePeople";

interface StageItem {
  id: string;
  name: string;
  label: string;
  href: string;
  accountId?: string;
}

const WORKS_WITH = ["Apple Health", "Fitness", "Apple Watch", "AirPods"];

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(min-width: 640px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );
}

const glass =
  "border border-white/60 bg-white/60 shadow-[0_14px_34px_rgba(170,70,20,0.16),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-xl";

export default function FamilyStage() {
  const { me, people } = usePeople();
  const demo = useJson<{ family: Member[] }>(me && !me.setUp ? "/api/sample/family" : null);
  const alerts = useJson<AlertsResponse>(me?.setUp ? "/api/alerts" : null);
  const [turn, setTurn] = useState(0);
  const startX = useRef<number | null>(null);
  const wide = useWide();

  const items: StageItem[] = me?.setUp
    ? (people ?? []).map((p) => ({ id: p.member.id, name: p.member.name, label: p.label, href: `/family/${p.member.id}`, accountId: p.person.account.id }))
    : (demo.data?.family ?? []).map((m) => ({ id: m.id, name: m.name, label: RELATIONSHIP[m.relationship], href: "/setup" }));
  const n = items.length;
  const step = n ? 360 / n : 0;
  const front = n ? items[((turn % n) + n) % n] : null;
  const status = front?.accountId ? alerts.data?.people.find((x) => x.accountId === front.accountId) : undefined;
  const first = front?.name.split(" ")[0] ?? "";
  const RX = wide ? 150 : 118;
  const size = wide ? 180 : 150;

  const go = (d: number) => n > 1 && setTurn((t) => t + d);

  const heading = (
    <div className="text-center sm:text-left">
      <div className={`mx-auto w-fit rounded-full px-4 py-1.5 text-footnote font-semibold text-[var(--brand-pressed)] sm:mx-0 ${glass}`}>
        {me?.setUp ? "Your family" : "The Rivera family"}
      </div>
      <h1 className="swap-in mt-3 text-large-title text-[#3b2418] sm:text-[52px] sm:leading-[1.05] sm:tracking-tight">
        {me?.setUp ? `Hi, ${me.account?.displayName.split(" ")[0]}` : "Your family's health"}
      </h1>
      <p className="mt-1.5 text-subhead text-[#7a5240] sm:max-w-sm sm:text-[17px]">
        {n > 1 ? "Swipe to turn the table. Tap someone to see how they're doing." : "Tap to see how they're doing."}
      </p>
    </div>
  );

  const card = front ? (
    <div aria-live="polite" className={`mx-auto w-full max-w-[340px] rounded-[28px] p-4 text-center sm:mx-0 sm:p-5 sm:text-left ${glass}`}>
      <div key={front.id} className="swap-in">
        <p className="text-title2 text-[#3b2418]">{front.name}</p>
        <p className="text-footnote text-[#7a5240]">{front.label}</p>
        {status && (
          <div className="mt-2 flex justify-center sm:justify-start">
            <StatusPill status={status.status} text={status.statusText} />
          </div>
        )}
      </div>
      <Link href={front.href} className="btn btn-primary mt-3 w-full">
        {me?.setUp ? (front.label === "You" ? "Open your health" : `Open ${first}'s health`) : "Set up this iPhone"}
        <ChevronRight size={16} />
      </Link>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 sm:justify-start" aria-hidden>
          {items.map((it) => (
            <span
              key={it.id}
              className={`h-1.5 rounded-full transition-all duration-500 ease-[var(--spring)] ${it.id === front.id ? "w-5 bg-[var(--brand)]" : "w-1.5 bg-[rgba(150,80,40,0.25)]"}`}
            />
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className={`mx-auto max-w-[340px] rounded-[28px] p-5 text-center ${glass}`}>
      <p className="text-subhead text-[#7a5240]">{me?.setUp ? "Nobody shares their health with you yet." : "Loading your family…"}</p>
    </div>
  );

  const arrow = "pressable z-40 grid h-11 w-11 place-items-center rounded-full text-[var(--brand-pressed)] " + glass;

  const stage = (
    <div
      className="relative mx-auto h-[300px] w-full max-w-[380px] touch-pan-y select-none sm:h-[420px] sm:max-w-[520px]"
      onPointerDown={(e) => {
        startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (dx > 40) go(-1);
        else if (dx < -40) go(1);
      }}
    >
      {/* platform: a bright 3-tone gradient that ends in the amber rim, like a hug */}
      <div
        className="absolute bottom-6 left-1/2 h-[120px] w-[340px] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_40%,#fffaf1_0%,#ffe1b5_45%,#ffad5c_80%,#f2843a_100%)] shadow-[0_22px_40px_rgba(190,80,20,0.35),inset_0_-10px_18px_rgba(200,90,20,0.35),inset_0_8px_14px_rgba(255,255,255,0.8)] [animation:platform-in_800ms_var(--spring)_both] sm:bottom-10 sm:h-[150px] sm:w-[440px]"
        style={{ transform: "translateX(-50%)" }}
      />
      <div className="absolute bottom-[54px] left-1/2 h-[64px] w-[250px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,#ffffff_0%,rgba(255,255,255,0)_70%)] opacity-80 sm:bottom-[86px] sm:w-[320px]" />

      {items.map((it, i) => {
        let a = i * step - (turn % (n || 1)) * step;
        a = ((((a + 180) % 360) + 360) % 360) - 180;
        const rad = (a * Math.PI) / 180;
        const depth = Math.cos(rad); // 1 = front, -1 = back
        const x = Math.sin(rad) * RX;
        const scale = 0.5 + 0.5 * ((depth + 1) / 2);
        const y = (1 - depth) * -34;
        const isFront = front?.id === it.id;
        return (
          <Link
            key={it.id}
            href={it.href}
            tabIndex={isFront ? 0 : -1}
            aria-hidden={!isFront}
            aria-label={isFront ? `Open ${it.name.split(" ")[0]}'s health` : undefined}
            onClick={(e) => {
              if (!isFront) {
                e.preventDefault();
                go(Math.round(a / step));
              }
            }}
            className="absolute bottom-[78px] left-1/2 transition-[transform,opacity,filter] duration-[800ms] ease-[var(--spring)] sm:bottom-[112px]"
            style={{
              transform: `translateX(-50%) translate(${x}px, ${y}px) scale(${scale})`,
              transformOrigin: "50% 100%",
              zIndex: Math.round(depth * 10) + 20,
              opacity: 0.35 + 0.65 * ((depth + 1) / 2),
              filter: isFront ? "none" : "saturate(.85)",
            }}
          >
            <span className="rise-in relative block" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="absolute -bottom-2 left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%] bg-[rgba(150,60,10,0.28)] blur-[6px]" />
              <span
                className={`relative block ${isFront ? "idle-float drop-shadow-[0_14px_20px_rgba(170,70,20,0.35)]" : "drop-shadow-[0_8px_12px_rgba(170,70,20,0.22)]"}`}
              >
                <Portrait id={it.id} size={size} />
              </span>
            </span>
          </Link>
        );
      })}

      {n > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous person" className={`absolute left-0 top-1/2 -translate-y-1/2 ${arrow}`}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next person" className={`absolute right-0 top-1/2 -translate-y-1/2 ${arrow}`}>
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  );

  return (
    <section
      aria-label="Your family"
      className="relative -mx-4 -mt-2 flex min-h-[calc(100dvh-52px-54px-env(safe-area-inset-bottom))] flex-col justify-center overflow-hidden px-4 pb-6 pt-4 sm:mx-0 sm:mt-0 sm:min-h-0 sm:rounded-[36px] sm:px-10 sm:py-12 sm:shadow-[0_30px_60px_rgba(170,70,20,0.18)]"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      <WarmArt drift={turn} />
      {wide ? (
        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-6">
          <div className="flex flex-col gap-6">
            {heading}
            {card}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-footnote text-[#7a5240]">Designed for iPhone, alongside</span>
              {WORKS_WITH.map((w) => (
                <span key={w} className="rounded-full bg-white/50 px-3 py-1 text-footnote font-medium text-[#5e4e46] backdrop-blur-md">
                  {w}
                </span>
              ))}
            </div>
          </div>
          {stage}
        </div>
      ) : (
        <div className="relative">
          {heading}
          <div className="-mt-2">{stage}</div>
          <div className="-mt-2">{card}</div>
        </div>
      )}
    </section>
  );
}
