"use client";
// "FaceTime iCare" card (TD). Starts a real FaceTime Video call to iCare's Chert line, where the
// chert-agent (Ish, Gemini Live) answers and runs the check-in. Chert calls are inbound only: the
// person FaceTimes the line, so the web app needs no Chert keys. See docs/CHERT.md.
// The link uses Apple's documented `facetime:` URL scheme, which opens FaceTime on iPhone, iPad and Mac.
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import { InfoIcon, VideoIcon } from "@/components/Icons";

// Not a secret: it's the public number people FaceTime. Override if Chert gives us a new trial line.
const LINE = process.env.NEXT_PUBLIC_CHERT_FACETIME_NUMBER || "+16282244223";

/** "+16282244223" -> "+1 (628) 224-4223" */
function pretty(n: string) {
  const d = n.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : n;
}

export default function FaceTimeCall() {
  // null until mounted, so the server render and first client render match.
  const [apple, setApple] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac, so Macintosh covers iPad too.
    setApple(/iPhone|iPad|iPod|Macintosh/.test(ua));
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(LINE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the number is shown on screen anyway.
    }
  }

  return (
    <Card
      title={
        <span id="facetime" className="flex scroll-mt-28 items-center gap-3">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-gradient-to-b from-[#16a3a1] to-brand text-white shadow-sm">
            <VideoIcon size={22} />
          </span>
          <span className="min-w-0">
            <span className="block">FaceTime iCare</span>
            <span className="block text-footnote font-normal text-secondary">Talk to the check-in face to face</span>
          </span>
        </span>
      }
    >
      <p className="text-subhead text-secondary">
        iCare answers with a friendly animated heart, asks who&apos;s calling, then checks in about sleep, energy, pain, mood and
        medicines. When you hang up, a short summary appears in <span className="font-semibold text-foreground">Recent check-ins</span>{" "}
        below. The call itself isn&apos;t recorded.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a href={`facetime:${LINE}`} className="btn btn-primary gap-2" aria-label={`Start a FaceTime Video call with iCare at ${pretty(LINE)}`}>
          <VideoIcon size={18} />
          Start FaceTime call
        </a>
        <button type="button" onClick={copy} className="btn btn-secondary">
          {copied ? "Number copied" : "Copy number"}
        </button>
        <span className="font-[family-name:var(--font-rounded)] text-headline tabular-nums" aria-label="iCare FaceTime number">
          {pretty(LINE)}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {copied ? "Number copied" : ""}
      </p>

      {apple === false && (
        <p className="mt-3 text-footnote text-secondary">
          FaceTime needs an iPhone, iPad or Mac. On this device, FaceTime the number above from your iPhone.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-1.5 text-footnote text-secondary">
        <li className="flex gap-2">
          <InfoIcon size={16} className="mt-px shrink-0 text-muted" />
          <span>
            <span className="font-semibold text-foreground">Give it a moment.</span> After the call connects, iCare takes about 10 seconds to say
            hello. Stay quiet until it does and let it finish its greeting. AirPods or holding the phone to your ear work best: speakerphone can
            interrupt it.
          </span>
        </li>
        <li className="flex gap-2">
          <InfoIcon size={16} className="mt-px shrink-0 text-muted" />
          <span>Use FaceTime Video. Calls last up to 5 minutes. If nobody answers, iCare&apos;s line may be offline: use the chat below.</span>
        </li>
        <li className="flex gap-2">
          <InfoIcon size={16} className="mt-px shrink-0 text-muted" />
          <span>
            Not medical advice. In an emergency, call <span className="font-semibold text-foreground">911</span>, not iCare.
          </span>
        </li>
      </ul>
    </Card>
  );
}
