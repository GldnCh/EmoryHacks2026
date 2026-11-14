// Loading skeletons (shimmer), friendly errors, and the "Loaded from Tiger Data" badge.
import { BoltIcon, WarningIcon } from "@/components/Icons";

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden className={`shimmer rounded-xl ${className}`} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Loading" className="card p-5 sm:p-6">
      <Skeleton className="mb-2 h-5 w-1/3" />
      <Skeleton className="mb-5 h-3.5 w-1/2" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="mb-3 h-16 w-full rounded-2xl last:mb-0" />
      ))}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex gap-3 p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
        <WarningIcon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-headline">We couldn&apos;t load this right now.</p>
        <p className="mt-0.5 text-footnote text-secondary">{message ?? "Please try again in a moment."}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary mt-3">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/** Shows where data came from. "Tiger Data" gets the speed badge; anything else says sample data. */
export function SourceBadge({ source, queryMs }: { source?: string; queryMs?: number }) {
  if (!source) return null;
  const tiger = source === "Tiger Data";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold ${
        tiger ? "bg-brand-soft text-[var(--brand-pressed)]" : "bg-fill text-secondary"
      }`}
    >
      {tiger ? <BoltIcon size={13} strokeWidth={2.2} /> : <span aria-hidden>•</span>}
      {tiger && queryMs !== undefined ? `Loaded from Tiger Data in ${queryMs} ms` : tiger ? "Tiger Data" : "Sample data"}
    </span>
  );
}
