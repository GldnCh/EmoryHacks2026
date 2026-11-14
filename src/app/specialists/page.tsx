"use client";
// Find specialists (Jam), from the public NPI Registry via /api/specialists.
//   /specialists?memberId=rosa  -> the specialist types that member's conditions need, near their home
//   free search                 -> any specialty near a city/state or ZIP
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import Disclaimer from "@/components/Disclaimer";
import { InfoIcon, PinIcon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import { CardSkeleton, ErrorNote } from "@/components/Status";
import { useJson } from "@/components/useJson";

interface Provider {
  npi: string;
  name: string;
  credential?: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
}

interface MemberResponse {
  member: { id: string; name: string };
  near: { city: string; state: string };
  groups: { specialty: string; forConditions: string[]; providers: Provider[] }[];
}

interface SearchResponse {
  specialty: string;
  count: number;
  providers: Provider[];
}

const SPECIALTIES = [
  "Cardiovascular Disease",
  "Endocrinology, Diabetes & Metabolism",
  "Allergy & Immunology",
  "Pediatrics",
  "Pulmonary Disease",
  "Family Medicine",
];

const NOTE = "Public directory data from the NPI Registry. iCare suggests, it doesn't endorse or book.";

function ProviderList({ providers }: { providers: Provider[] }) {
  if (!providers.length) return <p className="text-subhead text-secondary">No providers found here. Try a nearby city or a ZIP code.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {providers.map((p) => (
        <li key={p.npi} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-headline">
              {p.name}
              {p.credential && <span className="font-normal text-secondary">, {p.credential}</span>}
            </p>
            <p className="text-footnote text-secondary">{p.specialty}</p>
            <p className="text-footnote text-secondary">
              {p.address}, {p.city}, {p.state} {p.postalCode.slice(0, 5)}
            </p>
          </div>
          {p.phone && (
            <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className="btn btn-secondary mt-2 self-start sm:mt-0 sm:self-center">
              Call {p.phone}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function MemberSpecialists({ memberId }: { memberId: string }) {
  const { data, error, loading, status, retry } = useJson<MemberResponse>(`/api/specialists?memberId=${encodeURIComponent(memberId)}&limit=5`);
  if (status === 404) return <ErrorNote message={`We don't have a family member called "${memberId}".`} />;
  if (error) return <ErrorNote message={error} onRetry={retry} />;
  if (loading || !data) return <CardSkeleton lines={3} />;
  const first = data.member.name.split(" ")[0];
  return (
    <div className="flex flex-col gap-4">
      <p className="inline-flex items-center gap-1.5 text-subhead text-secondary">
        <PinIcon size={16} className="text-brand" /> For {first}&apos;s conditions, near {data.near.city}, {data.near.state}
      </p>
      {data.groups.length === 0 && <Card>{first} has no conditions on file that need a specialist.</Card>}
      {data.groups.map((g) => (
        <Card key={g.specialty} title={g.specialty} subtitle={`For ${g.forConditions.join(", ")}`}>
          <ProviderList providers={g.providers} />
        </Card>
      ))}
    </div>
  );
}

function FreeSearch() {
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [place, setPlace] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const { data, error, loading, retry } = useJson<SearchResponse>(url);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams({ specialty, limit: "10" });
    const p = place.trim();
    const zip = p.match(/^\d{5}$/)?.[0];
    if (zip) sp.set("zip", zip);
    else if (p) {
      // "Atlanta, GA" or "Atlanta GA"
      const m = p.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
      if (m) {
        sp.set("city", m[1].trim());
        sp.set("state", m[2].toUpperCase());
      } else sp.set("city", p);
    }
    setUrl(`/api/specialists?${sp}`);
  }

  return (
    <Card title="Search any specialty" subtitle="Pick a specialty, then a city and state (Atlanta, GA) or a ZIP code.">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-footnote font-semibold text-secondary">
          Specialty
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="min-h-11 rounded-xl bg-fill px-3 text-[17px] font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-footnote font-semibold text-secondary">
          City, state or ZIP
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Atlanta, GA or 30322"
            className="min-h-11 rounded-xl bg-fill px-3 text-[17px] font-normal text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-brand/50"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>
      {url && (
        <div className="mt-5" aria-live="polite">
          {error ? (
            <ErrorNote message={error} onRetry={retry} />
          ) : loading || !data ? (
            <CardSkeleton lines={2} />
          ) : (
            <>
              <p className="mb-3 text-footnote text-muted">
                {data.count} {data.specialty} provider{data.count === 1 ? "" : "s"}
              </p>
              <ProviderList providers={data.providers} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function Specialists() {
  const memberId = useSearchParams().get("memberId");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Specialists"
        back={memberId ? { href: `/family/${memberId}`, label: "Back" } : undefined}
        subtitle="The right kind of specialist for each family member's conditions, near where they live."
      />
      <p className="flex gap-2 text-footnote text-secondary">
        <InfoIcon size={16} className="mt-px shrink-0 text-muted" />
        {NOTE}
      </p>
      {memberId ? (
        <MemberSpecialists memberId={memberId} />
      ) : (
        <p className="text-subhead text-secondary">
          Open a family member from the{" "}
          <Link href="/dashboard" className="font-semibold text-brand">
            dashboard
          </Link>{" "}
          to see specialists for their conditions, or search below.
        </p>
      )}
      <FreeSearch />
      <Disclaimer />
    </div>
  );
}

export default function SpecialistsPage() {
  return (
    <Suspense fallback={<CardSkeleton lines={3} />}>
      <Specialists />
    </Suspense>
  );
}
