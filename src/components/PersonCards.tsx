// Small pieces shared by the dashboard and family pages for people you're connected to.
import Avatar from "@/components/Avatar";
import type { PersonWithHealth } from "@/components/usePeople";

export function LevelChip({ p }: { p: PersonWithHealth }) {
  if (p.person.self) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-fill px-2.5 py-1 text-caption font-semibold text-secondary">
      Shares: {p.person.levelLabel}
      {p.person.guardian ? " · you're a guardian" : ""}
    </span>
  );
}

/** For connections who share Basic only: who they are and whether they're okay, nothing else. */
export function BasicCard({ p, status }: { p: PersonWithHealth; status?: React.ReactNode }) {
  const first = p.member.name.split(" ")[0];
  return (
    <section className="card flex flex-col p-5 sm:p-6" aria-labelledby={`m-${p.member.id}`}>
      <div className="flex items-center gap-3">
        <Avatar id={p.member.id} name={p.member.name} size={48} />
        <span className="min-w-0 flex-1">
          <span id={`m-${p.member.id}`} className="block text-headline">
            {p.member.name}
          </span>
          <span className="block truncate text-footnote text-secondary">
            {p.label} · {p.member.location.city}, {p.member.location.state}
          </span>
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <LevelChip p={p} />
      </div>
      <div className="mt-4 flex-1">
        {status ?? (
          <p className="text-subhead text-secondary">
            {first} shares whether they&apos;re doing okay, plus important alerts. Health details stay private.
          </p>
        )}
      </div>
    </section>
  );
}
