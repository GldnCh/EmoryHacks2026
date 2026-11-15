"use client";
// A number that rolls into place (Cam), built with Motion (MIT): each character slides up with a soft blur and a
// spring, staggered left to right on first show; when the value changes, only the characters that changed roll.
// Screen readers read the whole value once (hidden text); the animated characters are hidden from them.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export default function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  const chars = value.split("");
  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className}`}>
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) => (
        <span key={i} aria-hidden className="relative inline-block">
          <AnimatePresence mode="popLayout" initial={!reduce}>
            <motion.span
              key={`${i}-${ch}`}
              className="inline-block"
              initial={{ y: "0.9em", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-0.9em", opacity: 0, filter: "blur(4px)" }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 28, delay: i * 0.035 }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
