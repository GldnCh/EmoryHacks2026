"use client";
// The people this iPhone may see (from useMe: yourself + your connections) joined with their health profiles
// (/api/sample/family). Pages use it so they only show people you're connected to, at the level they share.
import { inverseRelationship } from "@/lib/auth/permissions";
import type { Capability } from "@/lib/auth/types";
import type { Member } from "@/components/types";
import { useJson } from "@/components/useJson";
import { useMe, type Me, type MePerson } from "@/components/useMe";

export interface PersonWithHealth {
  person: MePerson;
  member: Member;
  /** "You", "Mother", "Spouse", ... from this iPhone owner's point of view. */
  label: string;
  can: (c: Capability) => boolean;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How this iPhone's owner would describe the person. A grant's relationship describes the viewer, so flip it. */
export function relationshipLabel(person: MePerson): string {
  if (person.self) return "You";
  const rel = inverseRelationship(person.relationship);
  return rel ? capitalize(rel) : "Connection";
}

export function usePeople(): { me: Me | null; people: PersonWithHealth[] | null; error: string | null; retry: () => void } {
  const { me } = useMe();
  const family = useJson<{ family: Member[] }>("/api/sample/family");
  if (!me || !family.data) return { me, people: null, error: family.error, retry: family.retry };
  const people = me.people.flatMap((p) => {
    const member = p.account.memberId ? family.data!.family.find((m) => m.id === p.account.memberId) : undefined;
    return member ? [{ person: p, member, label: relationshipLabel(p), can: (c: Capability) => p.capabilities.includes(c) }] : [];
  });
  return { me, people, error: null, retry: family.retry };
}
