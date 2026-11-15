"use client";
// Device previews (Cam): shareable links that show the live app inside an iPhone or Apple Watch frame, so judges
// on a laptop can see the phone and watch versions (/iphone, /apple-watch). The frame holds the real app in an
// iframe (same site, so the same setup and data). On an actual phone or watch, the link opens the app directly.
import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import FullScreen from "@/components/FullScreen";

type Kind = "iphone" | "watch";

const DEVICE = {
  iphone: { src: "/", w: 390, h: 844, bezel: 12, radius: 58, inner: 47, max: 1, direct: 500, title: "iPhone view", note: "The live app at iPhone size. Swipe the family table and tap anyone." },
  watch: { src: "/watch", w: 208, h: 248, bezel: 14, radius: 62, inner: 50, max: 2, direct: 260, title: "Apple Watch view", note: "The live Apple Watch view. Tap a person to see alerts and their next medicine." },
} as const;

const VIEWS = [
  { href: "/", label: "Desktop" },
  { href: "/iphone", label: "iPhone" },
  { href: "/apple-watch", label: "Apple Watch" },
];

export default function DevicePreview({ kind }: { kind: Kind }) {
  const d = DEVICE[kind];
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    // Already on a small screen (a real iPhone or Watch): open the app itself instead of a frame.
    if (window.innerWidth < d.direct) {
      window.location.replace(d.src);
      return;
    }
    const fit = () => {
      const fw = d.w + d.bezel * 2;
      const fh = d.h + d.bezel * 2;
      setScale(Math.min(d.max, (window.innerHeight - 190) / fh, (window.innerWidth - 32) / fw));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [d]);

  const fw = d.w + d.bezel * 2;
  const fh = d.h + d.bezel * 2;

  return (
    <FullScreen className="bg-[radial-gradient(120%_90%_at_20%_0%,#FFF1DC_0%,#FFD2AE_55%,#FFA27C_100%)] text-label">
      <div className="flex min-h-full flex-col items-center px-4 pb-6 pt-5">
        <header className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-headline font-bold">
            <BrandMark size={32} />
            iCare
          </Link>
          <nav aria-label="Choose a view" className="flex rounded-full bg-white/60 p-1 shadow-[0_6px_18px_rgba(170,70,20,0.12)] backdrop-blur-xl">
            {VIEWS.map((v) => {
              const on = (v.href === "/iphone" && kind === "iphone") || (v.href === "/apple-watch" && kind === "watch");
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-subhead font-semibold transition-colors ${on ? "bg-brand text-white" : "text-secondary hover:text-label"}`}
                >
                  {v.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <h1 className="mt-4 text-title3 font-bold">{d.title}</h1>
        <p className="mt-1 max-w-md text-center text-subhead text-secondary">{d.note}</p>

        <div className="mt-5 flex flex-1 items-start justify-center">
          {scale !== null && (
            <div style={{ width: fw * scale, height: fh * scale }}>
              <div
                className="relative origin-top-left bg-[#111] shadow-[0_30px_60px_rgba(122,46,16,0.35),inset_0_0_0_2px_#3a3a3c]"
                style={{ width: fw, height: fh, padding: d.bezel, borderRadius: d.radius, transform: `scale(${scale})` }}
              >
                {kind === "watch" && (
                  <>
                    <span aria-hidden className="absolute -right-[9px] top-[64px] h-[46px] w-[10px] rounded-r-md bg-[#3a3a3c]" />
                    <span aria-hidden className="absolute -right-[6px] top-[130px] h-[56px] w-[7px] rounded-r-md bg-[#2c2c2e]" />
                  </>
                )}
                <iframe
                  src={d.src}
                  title={`iCare ${d.title}`}
                  width={d.w}
                  height={d.h}
                  className="block border-0 bg-black"
                  style={{ borderRadius: d.inner }}
                />
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-footnote text-secondary">
          Fictional family, demo data. Not medical advice.{" "}
          {kind === "watch" ? "On a real Apple Watch, open icare-wall-e9.vercel.app/watch from Messages." : "On a real iPhone, this link opens the app directly."}
        </p>
      </div>
    </FullScreen>
  );
}
