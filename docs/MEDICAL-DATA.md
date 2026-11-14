# Medical data sources

IDoc combines **our fabricated Rivera family** (the patients) with **free public medical databases** (reference info about drugs, conditions and doctors). No real patient data is used anywhere.

| Source | Run by | Key needed? | Used for | Code |
|---|---|---|---|---|
| Sample family + 38 medicines | us | no | Patients, daily health data, starter medicine list | `src/lib/sample-data/health.ts`, `src/data/medicines.json` |
| **openFDA** | U.S. FDA | no (optional `OPENFDA_API_KEY` for higher limits) | Official drug labels: uses, boxed warnings, side effects, interactions; finding more drugs by use | `src/lib/medical/openfda.ts` |
| **RxNorm / RxNav** | National Library of Medicine | no | Brand ↔ generic names, typo-tolerant drug lookup, standard drug ids | `src/lib/medical/rxnorm.ts` |
| **MedlinePlus Connect** | National Library of Medicine | no | Plain-language explanations of conditions and drugs | `src/lib/medical/medlineplus.ts` |
| **NLM Clinical Tables** | National Library of Medicine | no | Condition/symptom autocomplete with ICD-10 codes | `src/lib/medical/clinicaltables.ts` |
| **NPI Registry** | CMS (Medicare) | no | Real licensed specialists by specialty and location | `src/lib/medical/npi.ts` |
| **Tiger Data** | Tiger Data (TimescaleDB) | yes: `TIGER_DATABASE_URL` | Storing the family's health history; fast monthly/weekly trend queries | `src/lib/tiger.ts`, `db/tiger/schema.sql` |
| **Typesense** | Typesense Cloud | yes | Fast medicine search over our list + RxNorm brands + FDA "uses" text | `scripts/seed-typesense.mjs` |

`src/lib/medical/conditions.ts` links each family condition to its ICD-10 code and the specialist type that treats it. Add a row there when you add a condition.

## API routes (all return JSON)
| Route | What it does | Example |
|---|---|---|
| `/api/medicines/search?q=` | Our list + RxNorm (brands/typos) + openFDA (more drugs by use) | `?q=zyrtec` → cetirizine · `?q=heartburn` → 2 of ours + 5 from FDA |
| `/api/medicines/<name>` | Everything about one drug: our entry, RxNorm names, FDA label, MedlinePlus page | `/api/medicines/lisinopril` (includes the FDA boxed warning) |
| `/api/conditions/search?q=` | Condition autocomplete with ICD-10 codes | `?q=asthma` |
| `/api/conditions/info?name=` or `?code=` | Plain-language explanation (MedlinePlus) + which specialist treats it | `?name=Type 2 diabetes` |
| `/api/specialists?memberId=` | Real specialists near that family member, one group per specialty their conditions need | `?memberId=rosa` → endocrinology + cardiology in Savannah |
| `/api/specialists?specialty=&city=&state=&zip=` | Any specialty, anywhere | `?specialty=Pediatrics&zip=30322` |
| `/api/family/<id>/profile` | Family member + explained conditions + medications with MedlinePlus links + latest month | `/api/family/jordan/profile` |
| `/api/trends/<id>` | Monthly trends from **Tiger Data** if connected, otherwise sample data (same shape) | `/api/trends/rosa` |
| `/api/trends/<id>?period=week` | Weekly trends (Tiger Data only) | |

Results from the public APIs are cached for a day. If a public API is down, routes still return our own sample data.

## Who uses what
- **TD (dashboard):** `/api/trends/<id>` for charts, `/api/family/<id>/profile` for the profile card, `/api/specialists?memberId=` for the specialist finder.
- **Ish (AI checkup + summaries):** feed `/api/trends/<id>` and `/api/family/<id>/profile` into Gemini. Use `/api/conditions/search` for symptom autocomplete. Link out to the MedlinePlus `url`s instead of letting the AI invent medical explanations.
- **Jam (search + data):** `npm run seed:typesense` (now enriched with RxNorm brands + FDA uses), `npm run seed:tiger` once Tiger Data is set up.

## Safety rules for this data
- Always show the `disclaimer` the routes return. openFDA itself says not to rely on it for medical decisions.
- openFDA includes some **older labels for drugs no longer sold** (e.g. ranitidine). Don't present search results as "what you should take".
- Provider info from the NPI Registry is public directory data. IDoc only **suggests** specialists; it doesn't endorse them or book appointments.
- Pill appearance varies by manufacturer; never claim to identify a real pill.
