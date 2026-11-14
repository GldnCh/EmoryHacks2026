// Small line icons in the spirit of SF Symbols (drawn by TD, 24x24, stroke uses currentColor).
// Decorative by default: every icon sits next to a text label.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 22, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HeartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
  </Icon>
);

export const PulseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </Icon>
);

export const VideoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6.5" width="12.5" height="11" rx="3" />
    <path d="m15.5 10.5 5-3v9l-5-3" />
  </Icon>
);

export const PillIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.2" y="8.6" width="17.6" height="6.8" rx="3.4" transform="rotate(-45 12 12)" />
    <path d="m9.6 9.6 4.8 4.8" />
  </Icon>
);

export const StethoscopeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5v5a4 4 0 0 0 8 0v-5" />
    <path d="M10 12.5v2a4.5 4.5 0 0 0 9 0V13" />
    <circle cx="19" cy="11" r="2" />
  </Icon>
);

export const DatabaseIcon = (p: IconProps) => (
  <Icon {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.8" />
    <path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6" />
    <path d="M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" />
  </Icon>
);

export const HouseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19Z" />
  </Icon>
);

export const PeopleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <circle cx="17" cy="9.5" r="2.5" />
    <path d="M16 14.2a4.5 4.5 0 0 1 5 4.8" />
  </Icon>
);

export const ChevronRight = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
  </Icon>
);

export const ChevronLeft = (p: IconProps) => (
  <Icon strokeWidth={2.4} {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </Icon>
);

export const WarningIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.6 3.2 17a2 2 0 0 0 1.7 3h14.2a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 16.8v.1" />
  </Icon>
);

export const BoltIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6Z" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);

export const WalkIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="m9 21 2.5-6 2.5 2.5V21M8 11l3-3.5h3l2 3.5 3 1.5M11 8l-1 6.5" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 14.5A7.8 7.8 0 0 1 9.5 4.5a7.8 7.8 0 1 0 10 10Z" />
  </Icon>
);

export const GaugeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
    <path d="m12 13 3.5-4" />
    <circle cx="12" cy="13.5" r="1" />
  </Icon>
);

export const DropIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8Z" />
  </Icon>
);

export const ArchiveIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5" />
    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
  </Icon>
);

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);
