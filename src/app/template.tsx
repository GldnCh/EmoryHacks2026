// Re-mounts on every navigation, so each screen eases in (fade + slight rise). Turned off for reduced motion in globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
