// A white rounded card (iOS grouped style): soft shadow, no border. Optional title row with a subtitle and an action.
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
    <section className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            {title && <h2 className="text-headline">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-footnote text-secondary">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
