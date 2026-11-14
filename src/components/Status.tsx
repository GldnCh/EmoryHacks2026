// Loading skeletons, friendly errors, and the "Loaded from Tiger Data" badge.

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Loading" className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <Skeleton className="mb-3 h-5 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="mb-2 h-16 w-full" />
      ))}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message?: string | null; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-line bg-warn-soft p-4 text-sm">
      <p className="font-semibold text-warn">We couldn&apos;t load this right now.</p>
      <p className="mt-1 text-secondary">{message ?? "Please try again in a moment."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-lg bg-surface px-3 py-1.5 font-medium text-foreground shadow-sm">
          Try again
        </button>
      )}
    </div>
  );
}

/** Shows where data came from. "Tiger Data" gets the speed badge; anything else says sample data. */
export function SourceBadge({ source, queryMs }: { source?: string; queryMs?: number }) {
  if (!source) return null;
  const tiger = source === "Tiger Data";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tiger ? "bg-brand-soft text-brand" : "bg-surface-muted text-secondary"
      }`}
    >
      <span aria-hidden>{tiger ? "⚡" : "•"}</span>
      {tiger && queryMs !== undefined ? `Loaded from Tiger Data in ${queryMs} ms` : tiger ? "Tiger Data" : "Sample data"}
    </span>
  );
}
