# Sample data

All of this is **fabricated** for the demo: fictional people and generated numbers. No real patient data. Medicine info is general reference only, not medical advice.

Works **without any API keys**, so the dashboard and search can be built right away.

## The Rivera family (Apple Health–style data)
12 months of daily data, **Nov 1 2025 – Oct 31 2026**, generated in `src/lib/sample-data/health.ts`. Everyone gets the same numbers every time.

| id | Who | Tracks | Story the data tells (good for demo summaries) |
|---|---|---|---|
| `jordan` | Jordan, 45, **you** (the app user) | steps, heart rate, sleep, exercise, **blood pressure, glucose** | Prediabetes + mild hypertension. Starts walking in **March 2026**: steps up, resting HR, BP and glucose improve all year. **Flu in late January** (steps crash, HR spikes). |
| `sam` | Sam, 43, spouse | steps, heart rate, sleep, exercise | Steady runner. **Stressful Aug–Sep 2026**: sleep drops ~1 hr, resting HR rises. |
| `mia` | Mia, 12, child | steps, heart rate, sleep, exercise | Mild asthma. Very active in sports seasons, less active and sleeps less in summer. |
| `rosa` | Rosa, 71, grandmother in another city | steps, heart rate, sleep, exercise, **blood pressure, glucose** | Diabetes, hypertension, high cholesterol. **BP and glucose rise Jun–Jul 2026** (possible missed doses), improve after a **medication review in August**. Good for the "track family health remotely" feature. |

Each family member also lists `conditions` and `medications` (ids from the medicine list).

**Minute-level vitals (Apple Watch-style):** `getMinuteVitals(memberId, date)` returns 1,440 readings (heart rate + steps) for any day, about 2.1 million for the family's year. They add up to that day's step total and follow each person's routine: sleeping heart rate overnight, Jordan's morning walk, Sam's 6 PM run, Mia's after-school sports, Rosa's gentle morning walk. `getHourlyVitals()` rolls a day up by hour. This is what gets loaded into Tiger Data's `vitals_minute` hypertable.

### Daily record shape
```json
{
  "date": "2026-10-14",
  "steps": 9312,
  "restingHeartRate": 67,
  "sleepHours": 7.1,
  "activeEnergyKcal": 562,
  "exerciseMinutes": 41,
  "bloodPressure": { "systolic": 126, "diastolic": 81 },
  "bloodGlucose": 98
}
```
`bloodPressure` and `bloodGlucose` only appear for Jordan and Rosa. `APPLE_HEALTH_TYPES` in `health.ts` maps each field to its real HealthKit identifier, so a real Apple Health connection can later return the same shape.

### Using it
**In server code / API routes** (TD, Ish):
```ts
import { getFamily, getDailyMetrics, getMonthlySummaries } from "@/lib/sample-data/health";

getFamily();                         // the 4 family members
getDailyMetrics("jordan");           // 365 days
getDailyMetrics("jordan", "2026-10"); // one month
getMonthlySummaries("rosa");         // 12 rows of monthly averages -> input for monthly/yearly summaries
```

**Over HTTP** (from the browser or to test with the Ports link):
| URL | Returns |
|---|---|
| `/api/sample/family` | The 4 family members |
| `/api/sample/health/jordan` | 365 days of daily metrics + 12 monthly summaries |
| `/api/sample/health/rosa?month=2026-07` | July 2026 daily metrics + 12 monthly summaries |

## Medicine list (for search)
`src/data/medicines.json`: **38 common medicines**, each with generic name, brand names, drug class, common uses, forms, an example appearance, whether a prescription is needed, and common side effects.

- **Without Typesense:** `/api/medicines/search?q=allergy` searches this list plus RxNorm and openFDA. Good enough to build the UI.
- **Load into Typesense** (Jam, once keys are in `.env.local`):
  ```
  npm run seed:typesense
  ```
  ✅ Expected output:
  ```
  Imported 38/38 medicines into Typesense.
  Test search "allergies": N results -> Cetirizine, Loratadine, ...
  ```
  Safe to re-run; it recreates the `medicines` collection. Search with `query_by: "genericName,brandNames,commonUses,drugClass"`.

Pill appearance varies by manufacturer and strength, so the app must never claim to identify a real pill from this list. It should suggest confirming with a pharmacist.

## Changing the data
Edit the story for a member in `generate()` in `health.ts` (e.g. move Jordan's flu dates), or add medicines to `medicines.json` and re-run `npm run seed:typesense`.
