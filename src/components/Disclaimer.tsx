// The safety line every health screen shows.
export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p role="note" className={`rounded-xl border border-line bg-surface-muted px-3 py-2 text-xs text-secondary ${className}`}>
      <strong className="font-semibold">Not medical advice.</strong> IDoc shows trends and general information only. For anything
      serious or worrying, talk to a clinician. In an emergency, call 911.
    </p>
  );
}
