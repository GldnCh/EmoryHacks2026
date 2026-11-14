// A white rounded panel. Optional title row with a subtitle and an action on the right.
import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function Card({ title, subtitle, action, className = "", children }: CardProps) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
