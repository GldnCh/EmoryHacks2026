"use client";
// iOS-style confirmation sheet for actions that change who can see someone's health.
// Shows a clear warning and a list of exactly what changes, then Confirm / Cancel. Escape or the backdrop cancels.
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  /** Short warning shown under the title. */
  warning?: ReactNode;
  /** Bullet list of exactly what will happen. */
  details?: ReactNode[];
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export default function ConfirmSheet({ open, title, warning, details, confirmLabel, destructive, busy, onConfirm, onCancel, children }: ConfirmSheetProps) {
  // Rendered into <body> (portal): the page-transition wrapper uses a transform, which would otherwise trap
  // `position: fixed` inside the page and leave the backdrop off-center.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-3xl bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-title3 font-semibold">
          {title}
        </h2>
        {warning && <p className={`mt-2 text-subhead ${destructive ? "text-[#b42318]" : "text-secondary"}`}>{warning}</p>}
        {details && details.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-2xl bg-fill p-3 text-subhead">
            {details.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}
        {children}
        <div className="mt-4 grid gap-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`btn min-h-12 text-[17px] font-semibold text-white disabled:opacity-60 ${destructive ? "bg-[#d92d20] hover:bg-[#b42318]" : "btn-primary"}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
          <button onClick={onCancel} className="btn btn-secondary min-h-12 text-[17px]">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
