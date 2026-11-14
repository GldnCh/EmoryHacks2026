// NPI Registry (CMS): every licensed U.S. healthcare provider, searchable by specialty and place.
// Docs: https://npiregistry.cms.hhs.gov/api-page  No key needed. Public directory data.
import { fetchJson, safeTerm } from "./http";

export interface Provider {
  npi: string;
  name: string;
  credential?: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
  source: "NPI Registry";
}

type Addr = {
  address_purpose: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  telephone_number?: string;
};
type Raw = {
  results?: {
    number: number | string;
    basic: { first_name?: string; last_name?: string; credential?: string; organization_name?: string };
    addresses: Addr[];
    taxonomies: { desc: string; primary: boolean }[];
  }[];
};

const titleCase = (s = "") => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export interface ProviderSearch {
  specialty: string; // NPI taxonomy description, e.g. "Cardiovascular Disease"
  city?: string;
  state?: string; // 2 letters
  postalCode?: string; // the API matches the start of the ZIP
  limit?: number;
}

export async function searchProviders({ specialty, city, state, postalCode, limit = 10 }: ProviderSearch): Promise<Provider[]> {
  const params = new URLSearchParams({ version: "2.1", enumeration_type: "NPI-1", limit: "50" });
  params.set("taxonomy_description", safeTerm(specialty));
  if (city) params.set("city", safeTerm(city));
  if (state && /^[A-Za-z]{2}$/.test(state)) params.set("state", state.toUpperCase());
  if (postalCode && /^\d{3,9}$/.test(postalCode)) params.set("postal_code", postalCode + "*");
  const data = await fetchJson<Raw>(`https://npiregistry.cms.hhs.gov/api/?${params}`);

  const providers: Provider[] = (data?.results ?? []).map((r) => {
    const loc = r.addresses.find((a) => a.address_purpose === "LOCATION") ?? r.addresses[0] ?? ({} as Addr);
    const tax = r.taxonomies.find((t) => t.primary) ?? r.taxonomies[0];
    return {
      npi: String(r.number),
      name: r.basic.organization_name ?? titleCase(`${r.basic.first_name ?? ""} ${r.basic.last_name ?? ""}`.trim()),
      credential: r.basic.credential,
      specialty: tax?.desc ?? specialty,
      address: titleCase([loc.address_1, loc.address_2].filter(Boolean).join(", ")),
      city: titleCase(loc.city),
      state: loc.state ?? "",
      postalCode: (loc.postal_code ?? "").slice(0, 5),
      phone: loc.telephone_number,
      source: "NPI Registry",
    };
  });
  // The registry matches the city on ANY address (even a mailing PO box), so prefer providers who practice there.
  const wanted = city?.toLowerCase();
  const practiceHere = wanted ? providers.filter((p) => p.city.toLowerCase() === wanted) : providers;
  return (practiceHere.length ? practiceHere : providers).slice(0, limit);
}
