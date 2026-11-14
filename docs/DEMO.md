# IDoc demo script

**Presenter:** Cam · **Driver (clicks):** TD · **Length:** 2 minutes (plus a 30-second version below)
**Live site:** https://idoc-wall-e9.vercel.app

The demo tells **one story**: the Rivera family's year, seen through IDoc. Every feature appears because the story needs it.

Pages marked ⏳ depend on a teammate's PR (TD = dashboard/family/data pages, Ish = check-in, Jam = medicines/specialists). If a page isn't merged by demo time, use the **backup** listed in that segment.

---

## The 2-minute demo

### 0:00–0:15 · The problem (Cam, no clicking)
> "Health data is everywhere: your watch, your parents' pill bottles, a hospital portal. But nobody connects it. When Grandma's blood pressure creeps up three hundred miles away, nobody notices until it's an ER visit. IDoc gives a family one place to see their health over time, understand it in plain language, and know who to call."

**Screen:** home page `/`

### 0:15–0:40 · The family dashboard ⏳ TD
**Click:** Dashboard → point to Rosa's card ("tracked remotely from Savannah").
> "This is the Rivera family: a year of Apple Watch–style data for all four of them. Grandma Rosa lives in Savannah. Look: her blood pressure jumped to 151 over 90 this summer."

**Click:** Rosa's card → in **12-month trends**, click the **BP** tab (the page opens on Steps) → her blood pressure chart: the "BP rise" band in Jun–Jul, then the "Med review" line in August.
> "IDoc spotted it. It turned out she'd been missing doses. After a medication review in August, it came back down."

**Backup:** open `/api/trends/rosa` and point at July (`avgSystolic: 150`) vs October (`128`).

### 0:40–1:05 · AI check-in and summary ⏳ Ish
**Click:** Check-in → pick Rosa → "Get yearly summary".
> "Gemini reads her whole year and explains it in plain language, with what to bring up with her doctor. It never diagnoses or changes doses, and it always says it's not medical advice."

**Then:** start a check-in, type: *"I've been dizzy when I stand up."* Show the gentle follow-up question.
**Optional safety moment:** type *"I have chest pain"* → it immediately says to call 911, without even asking the AI.
> "Over Chert, this check-in happens face-to-face on FaceTime." *(Say this only if the Chert integration works; otherwise say "Next, this runs over a FaceTime-style video call with Chert.")*

**Backup:** skip the live AI; describe it in one sentence and move on.

### 1:05–1:25 · Medicine search ⏳ Jam
**Click:** Medicines → type **"wal-zyr"** (a store brand).
> "Rosa's neighbor gave her 'Wal-Zyr'. What is it? IDoc knows every brand name from the National Library of Medicine: it's cetirizine, an allergy medicine."

**Click:** Lisinopril (Rosa's blood pressure med) → point to the red **FDA boxed warning**.
> "Every medicine shows the official FDA label, boxed warnings first, plus a plain-language guide."

**Safe searches:** `wal-zyr`, `zyrtec`, `lisinopril`, `allergies`, `heartburn`. (Avoid `allergy` until Jam's Typesense search is merged.)
**Backup:** open `/api/medicines/lisinopril` and read the `boxedWarning` line.

### 1:25–1:40 · Find a specialist ⏳ Jam
**Click:** from Rosa's page, "Find specialists near Savannah".
> "Her conditions map to the right specialists, and these are real, licensed doctors near her, from the national NPI Registry, with phone numbers."

**Backup:** open `/api/specialists?memberId=rosa&limit=2`.

### 1:40–1:55 · Powered by Tiger Data ⏳ TD
**Click:** Tiger Data page.
> "Under the hood: 2.1 million minute-by-minute readings in Tiger Data. Continuous aggregates make every chart load in about 3 milliseconds instead of 22, and compression shrinks it from 212 megabytes to 6. That's 97%."

**Backup:** open `/api/tiger/stats` and read `minuteRows`, `compression` and `benchmark`.

### 1:55–2:00 · Close (Cam)
> "IDoc: your family's health, explained. Built in 36 hours with Gemini, Tiger Data, Typesense and five public health databases, and no real patient data."

---

## 30-second version (if time is cut)
1. Dashboard → Rosa → **BP** tab: the spike and recovery (10 s)
2. Medicine search "wal-zyr" → cetirizine (8 s)
3. Tiger Data page: 2.1M readings, 97% compression, ~3 ms (8 s)
4. Close line (4 s)

---

## Before you present (do this 15 minutes before)
- [ ] Open every page once on the live site to warm it up (first loads are slower): `/`, `/dashboard`, `/family/rosa`, `/checkin`, `/medicines`, `/specialists?memberId=rosa`, `/data`
- [ ] Run each AI action once (Rosa's yearly summary) so the cached answer is instant during the demo
- [ ] Check `/api/health` shows `gemini`, `typesense` and `tigerData` all `true`
- [ ] Laptop: browser zoom 125–150%, notifications off, charger plugged in, other tabs closed
- [ ] Open the site on a phone once too (bottom tab bar), in case a judge asks to see mobile
- [ ] Have the **backup video** open in another tab (see below)
- [ ] Phone hotspot ready in case the venue Wi-Fi drops

## Backup plan
1. **Record a backup video** of this exact script once the pages are merged (Sat evening). Upload it unlisted (e.g. YouTube) and add the link to `docs/DEVPOST.md`.
2. If one page fails live: say "let me show you what's underneath" and open its backup API URL above (they return readable JSON).
3. If the whole site fails: play the video and narrate over it.

## Likely judge questions
| Question | Answer |
|---|---|
| Is this real patient data? | No. The Rivera family is fictional and their data is generated. The drug, condition and doctor information is real public reference data (FDA, National Library of Medicine, CMS). |
| Does the AI give medical advice? | No. It explains trends and labels in plain language, never diagnoses or changes doses, sends emergencies straight to 911 without calling the AI, and every screen says "not medical advice". |
| Why Tiger Data instead of a normal database? | Health data is time-series. Hypertables + continuous aggregates make "how has this changed?" questions instant, and compression fits a year of minute-level data for a family in 6 MB. |
| How does it connect to Apple Health? | The data model mirrors Apple HealthKit (each field maps to a HealthKit identifier). A native iOS app syncing real HealthKit data is our next step. |
| Are the doctors real? | Yes: licensed providers from the public NPI Registry. IDoc suggests them; it doesn't endorse or book. |
| What did you build vs. use? | See the README: we built the app, data generator, all five public-data connectors, the Tiger schema/queries and the AI features; we used Next.js, Gemini, Tiger Data, Typesense, Coder and Vercel. |
| What's next? | Native iOS + HealthKit, clinician review of AI summaries, sharing a monthly report with your doctor, medication reminders (which would have caught Rosa's missed doses). |
