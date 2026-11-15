// iCare's warm artwork background (Cam). Place inside a `relative overflow-hidden` container.
// fine paper-like grain so the art doesn't read as flat gradients
const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.25 0 0 0 0 0.12 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Warm artwork background (home stage, profile): blurred color shapes, two light swirls and a fine grain.
 *  `drift` moves the shapes a little (parallax), e.g. as the home platform turns. Decorative. */
export default function WarmArt({ drift = 0 }: { drift?: number }) {
  const shift = (k: number) => ({ transform: `translate3d(${Math.sin(drift * 0.9) * k}px, ${Math.cos(drift * 0.7) * k * 0.4}px, 0)` });
  const blob = "absolute rounded-full blur-3xl transition-transform duration-[1400ms] ease-[var(--spring)]";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(170deg,#fff6ea_0%,#ffe4c8_42%,#ffcfae_100%)]" />
      <div className={`${blob} -left-24 -top-24 h-80 w-80 bg-[#ffc46b] opacity-60`} style={shift(22)} />
      <div className={`${blob} -right-24 top-6 h-72 w-72 bg-[#ff8f6b] opacity-45`} style={shift(-30)} />
      <div className={`${blob} -bottom-28 left-6 h-80 w-80 bg-[#ffb199] opacity-50`} style={shift(-16)} />
      <div className={`${blob} -right-16 bottom-24 h-60 w-60 bg-[#ffd98a] opacity-55`} style={shift(26)} />
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice">
        <path d="M-40 260C60 180 160 300 260 220S420 120 460 180" fill="none" stroke="#fff" strokeWidth="38" strokeLinecap="round" opacity=".35" />
        <path d="M-40 430C80 360 180 470 290 400S430 330 470 380" fill="none" stroke="#fff6ea" strokeWidth="26" strokeLinecap="round" opacity=".45" />
      </svg>
      <div className="absolute inset-0 opacity-[0.09] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}

