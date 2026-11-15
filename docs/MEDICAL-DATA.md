# Medical data sources

iCare combines **our fabricated Rivera family** (the patients) with **free public medical databases** (reference info about drugs, conditions and doctors). No real patient data is used anywhere.

| Source | Run by | Key needed? | Used for | Code |
|---|---|---|---|---|
| Sample family + 38 medicines | us | no | Patients, daily health data, starter medicine list | `src/lib/sample-data/health.ts`, `src/data/medicines.json` |
| **openFDA** | U.S. FDA | no (optional `OPENFDA_API_KEY` for higher limits) | Official drug labels: uses, boxed warnings, side effects, interactions; finding more drugs by use | `src/lib/medical/openfda.ts` |
| **RxNorm / RxNav** | National Library of Medicine | no | Brand ↔ generic names, typo-tolerant drug lookup, standard drug ids | `src/lib/medical/rxnorm.ts` |
| **MedlinePlus Connect** | National Library of Medicine | no | Plain-language explanations of conditions and drugs | `src/lib/medical/medlineplus.ts` |
| **MedlinePlus Web Service** | National Library of Medicine | no (85 requests/min per IP) | Spelling suggestions for misspelled symptoms ("insomnea" → insomnia) in medicine search | `src/lib/medical/medlineplus.ts`, `src/lib/spelling.ts` |
| **NLM Clinical Tables** | National Library of Medicine | no | Condition/symptom autocomplete with ICD-10 codes | `src/lib/medical/clinicaltables.ts` |
| **NPI Registry** | CMS (Medicare) | no | Real licensed specialists by specialty and location | `src/lib/medical/npi.ts` |
| **Tiger Data** | Tiger Data (TimescaleDB) | yes: `TIGER_DATABASE_URL` | Our only database: profiles + daily metrics + ~2.1M minute-level heart-rate/step readings, 3 continuous aggregates (hourly, daily, monthly), compression | `src/lib/tiger.ts`, `db/tiger/schema.sql`, `scripts/seed-tigerdata.mjs` |
| **Typesense** | Typesense Cloud | yes | Fast medicine search over our list + RxNorm brands + FDA "uses" text | `scripts/seed-typesense.mjs`, `src/lib/medicine-search.ts` |

`src/lib/medical/conditions.ts` links each family condition to its ICD-10 code and the specialist type that treats it. Add a row there when you add a condition.

## API routes (all return JSON)
| Route | What it does | Example |
|---|---|---|
| `/api/medicines/search?q=` | **Typesense** over our list (typo-tolerant, ranked, highlights) + RxNorm (brands/typos) + openFDA (more drugs by use when < 3 hits). Falls back to a plain local search if Typesense is missing or down. Misspelled uses/symptoms are corrected first (`spelling`: MedlinePlus, then our vocabulary; drug names are left to RxNorm). Also returns `source` (`"Typesense"` or `"Local list"`), `facets` (drug class, Rx/OTC), `searchMs` and `spelling` | `?q=zyrtec` → cetirizine · `?q=lisinoprl` → lisinopril · `?q=heartburn` → 2 of ours + 5 from FDA · `?q=insomnea` → corrected to insomnia, 5 from FDA |
| `/api/medicines/search?q=&rx=true\|false&class=` | Same, filtered: `rx=true` prescription only, `rx=false` over the counter only, `class=` exact drug class. Facets are counted before filters, so filter chips stay visible | `?q=allergies&rx=false` · `?q=allergies&class=Antihistamine` |
| `POST /api/medicines/photo` | **Search by photo.** Body `{ "image": "data:image/jpeg;base64,..." }` (JPEG, PNG or WebP; over 3 MB → 413, other types → 415, bad JSON → 400). Gemini reads only the drug names printed on the label (never identifies loose pills by shape, color or imprint; no doses or advice), then each name runs through the same search as `/api/medicines/search`. Returns `{ names, results, photo: "label"\|"loose_pills"\|"other", message?, disclaimer }`. 503 if Gemini isn't configured. The photo is never stored or logged | Tylenol label → `["Tylenol","Acetaminophen"]` + acetaminophen results · loose pills → `names: []`, "Take a photo of the label or box instead." · non-medicine photo → `names: []` |
| `/api/medicines/<name>` | Everything about one drug: our entry, RxNorm names, FDA label, MedlinePlus page | `/api/medicines/lisinopril` (includes the FDA boxed warning) |
| `/api/conditions/search?q=` | Condition autocomplete with ICD-10 codes | `?q=asthma` |
| `/api/conditions/info?name=` or `?code=` | Plain-language explanation (MedlinePlus) + which specialist treats it | `?name=Type 2 diabetes` |
| `/api/specialists?memberId=` | Real specialists near that family member, one group per specialty their conditions need | `?memberId=rosa` → endocrinology + cardiology in Savannah |
| `/api/specialists?specialty=&city=&state=&zip=` | Any specialty, anywhere | `?specialty=Pediatrics&zip=30322` |
| `/api/family/<id>/profile` | Family member + explained conditions + medications with MedlinePlus links + latest month | `/api/family/jordan/profile` |
| `/api/trends/<id>` | Monthly trends from **Tiger Data** if connected, otherwise sample data (same shape) | `/api/trends/rosa` |
| `/api/trends/<id>?period=week` | Weekly trends (Tiger Data only) | |
| `/api/vitals/<id>?date=YYYY-MM-DD` | One day hour by hour (heart rate avg/min/max, steps) from minute readings; Tiger Data `vitals_hourly` aggregate, or computed from sample data | `/api/vitals/sam?date=2026-10-03` (6 PM run: 127 bpm, 8,410 steps) |
| `/api/tiger/cohort?condition=` | Everyone with a condition + their monthly trends: profiles JOINed with the time-series aggregate in one query | `?condition=hypertension` → Jordan + Rosa |
| `/api/tiger/stats` | Demo numbers: rows stored, chunks, compression savings, continuous aggregates, raw-vs-aggregate query speed (Tiger Data only) | |

Results from the public APIs are cached for a day. If a public API is down, routes still return our own sample data.

## Who uses what
- **TD (dashboard):** `/api/trends/<id>` for charts, `/api/family/<id>/profile` for the profile card, `/api/specialists?memberId=` for the specialist finder.
- **Ish (AI checkup + summaries):** feed `/api/trends/<id>` and `/api/family/<id>/profile` into Gemini. Use `/api/conditions/search` for symptom autocomplete. Link out to the MedlinePlus `url`s instead of letting the AI invent medical explanations.
- **Pages:** `/medicines` (search), `/medicines/<name>` (detail), `/specialists` and `/specialists?memberId=<id>` use the routes above.
- **Jam (search + data):** `npm run seed:typesense` once the Typesense keys are in `.env.local` (enriched with RxNorm brands + FDA uses). Tiger Data is already loaded.

## Safety rules for this data
- Always show the `disclaimer` the routes return. openFDA itself says not to rely on it for medical decisions.
- openFDA includes some **older labels for drugs no longer sold** (e.g. ranitidine). Don't present search results as "what you should take".
- Provider info from the NPI Registry is public directory data. iCare only **suggests** specialists; it doesn't endorse them or book appointments.
- Pill appearance varies by manufacturer; never claim to identify a real pill.
