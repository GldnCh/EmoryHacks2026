"use client";
// "Family medicines" (Jam): pick a family member, tap one of their medicines to open its page.
// Members come from /api/sample/family; each member's medicines from /api/family/<id>/profile.
// /medicines?member=rosa pre-selects Rosa. Built with TD's Card, SegmentedControl, Avatar and Status.
import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import { ChevronRight } from "@/components/Icons";
import SegmentedControl from "@/components/SegmentedControl";
import { ErrorNote, Skeleton } from "@/components/Status";
import type { Member, ProfileResponse } from "@/components/types";
import { useJson } from "@/components/useJson";

const firstName = (m: Member) => m.name.split(" ")[0];

/** Keep ?member= in the URL (only when it changed: Next's router listens to replaceState). */
function syncMemberParam(id: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("member") === id) return;
  url.searchParams.set("member", id);
  window.history.replaceState(null, "", url);
}

function MedicineChips({ memberId }: { memberId: string }) {
  const { data, error, loading, retry } = useJson<ProfileResponse>(`/api/family/${memberId}/profile`);
  // useJson keeps the previous member's data while the next loads; don't show it under the wrong name
  const current = data?.member.id === memberId ? data : null;

  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !current) {
    return (
      <div role="status" aria-label="Loading medicines" className="flex gap-2">
        <Skeleton className="h-11 w-32 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    );
  }
  if (!current.medications.length) {
    return <p className="text-subhead text-secondary">No medicines on file for {firstName(current.member)}.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label={`${firstName(current.member)}'s medicines`}>
      {current.medications.map((med) => {
        const name = med.sample?.genericName ?? med.id;
        const brand = med.sample?.brandNames[0];
        return (
          <li key={med.id}>
            <Link
              href={`/medicines/${encodeURIComponent(med.id)}`}
              className="pressable group inline-flex min-h-11 items-center gap-1 rounded-full bg-brand-soft pl-4 pr-2.5 text-subhead font-semibold text-[var(--brand-pressed)] hover:bg-fill"
            >
              {name}
              {brand && <span className="font-normal text-secondary">· {brand}</span>}
              <ChevronRight size={16} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function FamilyMedicines({ initialMember }: { initialMember?: string | null }) {
  const { data, error, retry } = useJson<{ family: Member[] }>("/api/sample/family");
  const family = data?.family ?? [];
  const [selected, setSelected] = useState<string | null>(initialMember ?? null);

  // default to the first member (Jordan, "you") once the family loads, unless ?member= picked someone valid
  useEffect(() => {
    const list = data?.family ?? [];
    if (list.length && !list.some((m) => m.id === selected)) setSelected(list[0].id);
  }, [data, selected]);

  function choose(id: string) {
    setSelected(id);
    syncMemberParam(id);
  }

  const member = family.find((m) => m.id === selected);

  return (
    <Card title="Family medicines" subtitle="Tap a medicine to see its label, warnings and plain-language guide.">
      {error ? (
        <ErrorNote message={error} onRetry={retry} />
      ) : !member ? (
        <Skeleton className="h-[38px] w-full rounded-[12px]" />
      ) : (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            ariaLabel="Family member"
            controls="family-meds"
            value={member.id}
            onChange={choose}
            options={family.map((m) => ({ value: m.id, label: firstName(m) }))}
          />
          <div id="family-meds" role="tabpanel" className="flex items-start gap-3">
            <span className="hidden sm:block">
              <Avatar id={member.id} name={member.name} size={44} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-footnote text-secondary">
                <span className="font-semibold text-foreground">{member.name}</span>
                {member.conditions.length > 0 && <> · {member.conditions.join(", ")}</>}
              </p>
              <MedicineChips memberId={member.id} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
