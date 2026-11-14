"use client";
// iOS segmented control: gray track, white sliding thumb. Arrow keys move between options.
import { useRef } from "react";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  /** id of the panel the control switches, for aria-controls */
  controls?: string;
}

export default function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, controls }: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className="relative flex rounded-[12px] bg-fill p-[3px]">
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[9px] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[var(--ease-ios)]"
        style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const selected = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`relative z-10 min-h-[38px] flex-1 truncate rounded-[9px] px-1.5 text-footnote transition-colors ${
              selected ? "font-semibold text-foreground" : "font-medium text-secondary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
