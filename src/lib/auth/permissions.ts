// Permission levels, like Apple Family Sharing but per person and adjustable.
// Every feature asks one question: can THIS signed-in account do THIS with THAT person's data?
import type { Capability, Level, SharingGrant } from "./types";

export const LEVELS: Record<Level, { label: string; description: string; capabilities: Capability[] }> = {
  full: {
    label: "Full",
    description: "Everything: trends, day-by-day vitals, medicines, check-ins, appointments and reminders. For kids and parents you care for.",
    capabilities: ["profile", "conditions", "trends", "vitals", "medications", "checkins", "appointments", "reminders"],
  },
  summary: {
    label: "Health summary",
    description: "Monthly trends, conditions, medicines and appointments. No minute-by-minute data or check-in conversations. For a partner.",
    capabilities: ["profile", "conditions", "trends", "medications", "appointments"],
  },
  basic: {
    label: "Basic",
    description: "Just whether they're doing okay, plus important alerts. For friends.",
    capabilities: ["profile"],
  },
};

export const ALL_CAPABILITIES: Capability[] = [
  "profile", "conditions", "trends", "vitals", "medications", "checkins", "appointments", "reminders", "act", "manageSharing",
];

/** Capabilities a viewer has on a subject: everything for yourself; level (+ act/manageSharing for guardians) otherwise. */
export function capabilitiesFor(viewerId: string, subjectId: string, grant?: Pick<SharingGrant, "level" | "guardian"> | null): Capability[] {
  if (viewerId === subjectId) return ALL_CAPABILITIES;
  if (!grant) return [];
  const caps = new Set<Capability>(LEVELS[grant.level].capabilities);
  if (grant.guardian) {
    caps.add("act");
    caps.add("manageSharing");
  }
  return [...caps];
}

export const isLevel = (v: unknown): v is Level => v === "full" || v === "summary" || v === "basic";
