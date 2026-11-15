// The safety line every health screen shows.
import { InfoIcon } from "@/components/Icons";

export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`flex gap-2.5 rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-footnote text-secondary backdrop-blur-xl ${className}`}>
      <InfoIcon size={18} className="mt-px shrink-0 text-muted" />
      <span>
        <strong className="font-semibold text-foreground">Not medical advice.</strong> iCare shows trends and general information only.
        For anything serious or worrying, talk to a clinician. In an emergency, call 911.
      </span>
    </p>
  );
}
