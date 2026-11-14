// Shared recharts styling: quiet axes, faint grid, frosted tooltip.
import type { CSSProperties } from "react";

export const AXIS_TICK = { fontSize: 11, fill: "var(--text-muted)" };

export const GRID_STROKE = "var(--grid)";

export const TOOLTIP_STYLE: CSSProperties = {
  background: "rgba(255, 255, 255, 0.86)",
  backdropFilter: "saturate(180%) blur(16px)",
  WebkitBackdropFilter: "saturate(180%) blur(16px)",
  border: "none",
  borderRadius: 12,
  boxShadow: "var(--shadow-raised)",
  fontSize: 12,
  color: "var(--foreground)",
  padding: "8px 12px",
};

export const TOOLTIP_LABEL_STYLE: CSSProperties = { fontWeight: 600, marginBottom: 2 };
