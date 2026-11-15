// Friendly 3D-style cartoon portraits of the fictional Rivera family (Cam). Original drawings, inspired by
// the playful look of avatar stickers; no Apple Memoji artwork is used. Decorative: names are always shown.
import { useId } from "react";

type Hair = "short" | "long" | "puffs" | "curly";
interface Look {
  skin: [string, string]; // light, shade
  hair: string;
  hairShade: string;
  style: Hair;
  shirt: [string, string];
  glasses?: boolean;
  earrings?: boolean;
  young?: boolean;
}

const LOOKS: Record<string, Look> = {
  jordan: { skin: ["#F0BC92", "#D8956A"], hair: "#4A2C1D", hairShade: "#2E1A10", style: "short", shirt: ["#6FA3F0", "#3F72CC"] },
  sam: { skin: ["#F6CDA6", "#E0A57C"], hair: "#7A4527", hairShade: "#55301A", style: "long", shirt: ["#FF9A7A", "#E5603F"], earrings: true },
  mia: { skin: ["#E8AB7E", "#C98458"], hair: "#3A2216", hairShade: "#22130B", style: "puffs", shirt: ["#FF9CC8", "#E05F9C"], young: true },
  rosa: { skin: ["#F2BE95", "#D99C72"], hair: "#ECE6E1", hairShade: "#BDB4AE", style: "curly", shirt: ["#B9A0F5", "#8664DA"], glasses: true },
};
const FALLBACK: Look = { skin: ["#EBC09B", "#CF9B74"], hair: "#5B4636", hairShade: "#3B2C21", style: "short", shirt: ["#F3B07A", "#D9773F"] };

export default function Portrait({ id, size = 120, className = "" }: { id: string; size?: number; className?: string }) {
  const L = LOOKS[id] ?? FALLBACK;
  const u = useId().replace(/:/g, "");
  const eyeY = L.young ? 63 : 62;
  const eyeR = L.young ? 4.4 : 3.9;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden className={className}>
      <defs>
        <radialGradient id={`${u}skin`} cx=".38" cy=".32" r=".8">
          <stop offset="0" stopColor={L.skin[0]} />
          <stop offset="1" stopColor={L.skin[1]} />
        </radialGradient>
        <linearGradient id={`${u}hair`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.hair} />
          <stop offset="1" stopColor={L.hairShade} />
        </linearGradient>
        <linearGradient id={`${u}shirt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.shirt[0]} />
          <stop offset="1" stopColor={L.shirt[1]} />
        </linearGradient>
        <radialGradient id={`${u}shine`} cx=".35" cy=".25" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* shoulders */}
      <path d="M18 120c0-20 18-31 42-31s42 11 42 31Z" fill={`url(#${u}shirt)`} />
      <path d="M48 90c3 6 21 6 24 0" fill="none" stroke="rgba(0,0,0,.08)" strokeWidth="3" strokeLinecap="round" />
      {/* neck */}
      <rect x="51" y="78" width="18" height="16" rx="8" fill={L.skin[1]} />

      {/* hair behind the head */}
      {L.style === "long" && <path d="M26 58c0-24 15-38 34-38s34 14 34 38v30c0 5-4 8-9 8H35c-5 0-9-3-9-8Z" fill={`url(#${u}hair)`} />}
      {L.style === "puffs" && (
        <>
          <circle cx="24" cy="40" r="13" fill={`url(#${u}hair)`} />
          <circle cx="96" cy="40" r="13" fill={`url(#${u}hair)`} />
        </>
      )}
      {L.style === "curly" &&
        [
          [30, 46, 11], [40, 32, 12], [55, 25, 12], [70, 26, 12], [84, 33, 12], [92, 47, 11], [28, 60, 9], [93, 61, 9],
        ].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={`url(#${u}hair)`} />)}

      {/* ears + head */}
      <ellipse cx="30" cy="62" rx="6" ry="8" fill={L.skin[1]} />
      <ellipse cx="90" cy="62" rx="6" ry="8" fill={L.skin[1]} />
      {L.earrings && (
        <>
          <circle cx="30" cy="72" r="2.6" fill="#FFD27A" />
          <circle cx="90" cy="72" r="2.6" fill="#FFD27A" />
        </>
      )}
      <ellipse cx="60" cy="58" rx="30" ry="32" fill={`url(#${u}skin)`} />

      {/* hair on top */}
      {L.style === "short" && <path d="M30 52c-1-20 12-30 30-30s32 9 30 29c-6-9-15-13-28-13-14 0-24 5-32 14Z" fill={`url(#${u}hair)`} />}
      {L.style === "long" && <path d="M30 55c1-19 13-31 30-31 18 0 30 12 30 30-9-3-17-10-21-18-6 11-21 17-39 19Z" fill={`url(#${u}hair)`} />}
      {L.style === "puffs" && <path d="M31 52c0-18 12-28 29-28s29 10 29 28c-7-7-17-10-29-10s-22 3-29 10Z" fill={`url(#${u}hair)`} />}
      {L.style === "curly" &&
        [
          [40, 34, 9], [52, 29, 9], [65, 29, 9], [78, 34, 9], [34, 44, 7], [86, 44, 7],
        ].map(([x, y, r]) => <circle key={`f${x}-${y}`} cx={x} cy={y} r={r} fill={`url(#${u}hair)`} />)}

      {/* face */}
      <path d={`M${44} ${eyeY - 9}q5-3 10 0`} stroke={L.style === "curly" ? "#9C8F86" : L.hairShade} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d={`M${66} ${eyeY - 9}q5-3 10 0`} stroke={L.style === "curly" ? "#9C8F86" : L.hairShade} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <ellipse cx="49" cy={eyeY} rx={eyeR} ry={eyeR + 1} fill="#2B1F1A" />
      <ellipse cx="71" cy={eyeY} rx={eyeR} ry={eyeR + 1} fill="#2B1F1A" />
      <circle cx="50.3" cy={eyeY - 1.6} r="1.3" fill="#fff" />
      <circle cx="72.3" cy={eyeY - 1.6} r="1.3" fill="#fff" />
      {L.glasses && (
        <g fill="none" stroke="#8A5A44" strokeWidth="2">
          <circle cx="49" cy={eyeY} r="8.5" />
          <circle cx="71" cy={eyeY} r="8.5" />
          <path d={`M57.5 ${eyeY}h5`} />
        </g>
      )}
      <ellipse cx="41" cy="72" rx="5.5" ry="3.4" fill="#FF8A7A" opacity=".35" />
      <ellipse cx="79" cy="72" rx="5.5" ry="3.4" fill="#FF8A7A" opacity=".35" />
      <path d="M57 69q3 2.2 6 0" stroke={L.skin[1]} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M50 76q10 9 20 0" fill="#fff" stroke="#9A3E2A" strokeWidth="2.4" strokeLinejoin="round" />
      {/* soft 3D shine */}
      <ellipse cx="60" cy="58" rx="30" ry="32" fill={`url(#${u}shine)`} />
    </svg>
  );
}
