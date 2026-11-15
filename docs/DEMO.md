# iCare demo script

**Presenter:** Cam · **Driver (clicks):** TD · **Length:** 2 minutes (plus a 30-second version below)
**Live site:** https://icare-wall-e9.vercel.app

The demo tells **one story**: the Rivera family's year, seen through iCare. Every feature appears because the story needs it.

Every page in this script is merged and live. Each segment still lists a **backup** in case something fails during the demo.

---

## The 2-minute demo

### 0:00–0:15 · The problem (Cam, no clicking)
> "Health data is everywhere: your watch, your parents' pill bottles, a hospital portal. But nobody connects it. When Grandma's blood pressure creeps up three hundred miles away, nobody notices until it's an ER visit. iCare gives a family one place to see their health over time, understand it in plain language, and know who to call."

**Screen:** home page `/`

### 0:15–0:35 · The family dashboard (TD drives)
**Before the demo:** this laptop must be set up as **Jordan's iPhone** (`/setup` → Jordan). The dashboard only shows you and the people you're connected to, at the level each one shares.

**Click:** Dashboard → point to Rosa's card ("tracked remotely from Savannah") and the "Shares: Full · you're a guardian" chip.
> "This is the Rivera family, seen from Jordan's iPhone. Everyone chooses what they share: Rosa shares everything with her son, Sam shares a health summary. This is a year of Apple Watch–style data for all four of them. Grandma Rosa lives in Savannah. Look: her blood pressure jumped to 151 over 90 this summer."

**Click:** Rosa's card → **12-month trends** opens on the **BP** tab (direct link: `/family/rosa?tab=bp`) → her blood pressure chart: the "BP rise" band in Jun–Jul, then the "Med review" line in August.
> "iCare spotted it. It turned out she'd been missing doses. After a medication review in August, it came back down."

**Backup:** open `/api/trends/rosa` (in the same browser, so it knows whose iPhone this is) and point at July (`avgSystolic: 150`) vs October (`128`).

### 0:35–0:55 · Reminders, alerts and the doctor report (Cam)
**Click:** Dashboard → point to **Family alerts**: "Rosa missed 2 doses in the last 2 days", and Rosa's "May need a check-in" pill.
> "iCare noticed before anyone else could: Grandma Rosa missed her evening pills twice this week. Jordan sees it because Rosa shares everything with her son. Sam only shares a summary, so Sam never sees the details."

**Click:** Rosa's card → **Medication reminders**: the 7-day grid with the two red evening misses → tap **Taken** on tonight's dose (Jordan is her guardian).
**Click:** **Doctor report** (top of Rosa's page) → scroll: questions to ask the doctor, doses taken, a year of averages → **Print or save as PDF**.
> "Before her next visit, Jordan prints one page for her doctor, with questions to ask, written by Gemini from her real numbers."

**Big safety moment (if the FaceTime agent is running):** FaceTime iCare, wait for it to finish its greeting, then say *"I have chest pain"*. The agent tells you to call 911. After hanging up, refresh Jordan's dashboard: an **urgent** alert appears ("Rosa's check-in mentioned emergency symptoms").
**Backup:** open `/api/alerts` and `/api/reminders/rosa` in the same browser.

### 0:55–1:15 · AI check-in and summary (Ish's feature)
**Click:** Check-in → pick Rosa → "Get yearly summary".
> "Gemini reads her whole year and explains it in plain language, with what to bring up with her doctor. It never diagnoses or changes doses, and it always says it's not medical advice."

**Then:** start a check-in, type: *"I've been dizzy when I stand up."* Show the gentle follow-up question.
**Optional safety moment:** type *"I have chest pain"* → it immediately says to call 911, without even asking the AI.
**FaceTime moment (Chert, confirmed working):** tap **Start FaceTime call** on `/checkin` (or call the number) from an iPhone, then **stay quiet**: the line takes ~10 seconds to get ready, and talking (or a speakerphone echo) during the greeting cuts it off. Use AirPods or hold the phone to your ear, not speakerphone, and only answer once it has finished greeting you.
> "And it doesn't have to be a website. Grandma Rosa can just FaceTime iCare, and the same check-in answers, by voice, with her own health data."
*(Ish's agent must be running in Ish's Coder workspace before the demo. If the call doesn't connect within ~5 seconds, hang up and continue with `/checkin`.)*

**Apple Watch moment (confirmed working on a real Watch, ~20 s):** on the Watch, open `/watch` (text yourself the link and tap it). Rosa is at the top with *"May need a check-in"*; tap her to show *"Rosa missed 2 doses in the last 2 days"* and her next medicine. Then tap **Check in with iCare**: it starts a FaceTime audio call to the same Chert agent, and the summary saves like any other check-in. Same "stay quiet during the greeting" rule.
> "Rosa doesn't even need her phone. She sees the alert on her wrist and taps once to check in with iCare."

**Judges on a laptop?** Show `/apple-watch` (the watch view in a watch frame) or `/iphone` (the app in an iPhone frame). The switch at the top flips between Desktop, iPhone and Apple Watch.

**Backup:** skip the live AI; describe it in one sentence and move on. (The summary is cached after the first click, so pre-run it before presenting.)

### 1:15–1:35 · Medicine search (Jam's feature)
**Click:** Medicines → type **"wal-zyr"** (a store brand).
> "Rosa's neighbor gave her 'Wal-Zyr'. What is it? iCare knows every brand name from the National Library of Medicine: it's cetirizine, an allergy medicine."

**Click:** Lisinopril (Rosa's blood pressure med) → point to the red **FDA boxed warning** → click **✨ Explain this label simply**.
> "Every medicine shows the official FDA label, boxed warnings first, and Gemini explains it in plain language using only the label's own text."

**Optional 10-second beat (bring a real medicine box):** tap **📷 Search by photo**, photograph the box, and the name fills in with results.
> "No typing: snap the label. iCare reads only the printed name, and it refuses to guess a loose pill from how it looks."

**Safe searches:** `wal-zyr`, `zyrtec`, `lisinopril`, `allergies`, `allergy`, `heartburn`.
**Backup:** open `/api/medicines/lisinopril` and read the `boxedWarning` line.

### 1:35–1:45 · Find a specialist (Jam's feature)
**Click:** from Rosa's page, "Find specialists near Savannah".
> "Her conditions map to the right specialists, and these are real, licensed doctors near her, from the national NPI Registry, with phone numbers."

**Backup:** open `/api/specialists?memberId=rosa&limit=2`.

### 1:45–1:55 · Powered by Tiger Data (TD's page)
**Click:** Tiger Data page.
> "Under the hood: 2.1 million minute-by-minute readings in Tiger Data. Continuous aggregates make every chart load in about 3 milliseconds instead of 22, and compression shrinks it from 212 megabytes to 6. That's 97%."

**Backup:** open `/api/tiger/stats` and read `minuteRows`, `compression` and `benchmark`.

### 1:55–2:00 · Close (Cam)
> "iCare: your family's health, explained. Built in 36 hours with Gemini, Tiger Data, Typesense and five public health databases, and no real patient data."

---

## 30-second version (if time is cut)
1. Dashboard → Rosa (opens on the **BP** tab): the spike and recovery, then the missed-doses alert (10 s)
2. Medicine search "wal-zyr" → cetirizine (8 s)
3. Tiger Data page: 2.1M readings, 97% compression, ~3 ms (8 s)
4. Close line (4 s)

---

## Before you present (do this 15 minutes before)
- [ ] On the demo laptop's browser, open `/setup` and choose **Jordan** (once; it's remembered). To show another person's view, use "Pretend to be another iPhone" on `/account`, or a private window
- [ ] Open every page once on the live site to warm it up (first loads are slower): `/`, `/dashboard`, `/family/rosa`, `/checkin`, `/medicines?member=rosa`, `/medicines/lisinopril`, `/specialists?memberId=rosa`, `/data`
- [ ] Run each AI action once (Rosa's yearly summary, and Rosa's doctor report at `/family/rosa/report`) so the cached answer is instant during the demo
- [ ] Don't tap "Log as taken" on Rosa's missed doses before the demo (that clears the alert). Tonight's "Taken" taps are fine
- [ ] Check `/api/health` shows `gemini`, `typesense` and `tigerData` all `true`
- [ ] **Ish: start the Chert FaceTime agent** in your Coder workspace (see `chert-agent/README.md`) and place one test FaceTime call; keep the workspace awake through the demo. Presenter: pair AirPods with the demo iPhone (speakerphone in a noisy room can interrupt the greeting)
- [ ] Laptop: browser zoom 125–150%, notifications off, charger plugged in, other tabs closed
- [ ] Open the site on a phone once too (bottom tab bar), in case a judge asks to see mobile
- [ ] **Apple Watch:** open `icare-wall-e9.vercel.app/watch` on the Watch from Messages, choose **Jordan** if it asks, and keep the Watch charged. Place one short test call with **Check in with iCare** during the agent check (FaceTime minutes are limited)
- [ ] Have the **backup video** open in another tab (see below)
- [ ] Phone hotspot ready in case the venue Wi-Fi drops

## Backup plan
1. **Backup video (done):** https://youtu.be/5OxAAXvU8ZU (unlisted, 2:52). Keep it open in a tab, and keep the downloaded copy on the laptop in case the Wi-Fi drops.
2. If one page fails live: say "let me show you what's underneath" and open its backup API URL above (they return readable JSON).
3. If the whole site fails: play the video and narrate over it.

## Likely judge questions
| Question | Answer |
|---|---|
| Is this real patient data? | No. The Rivera family is fictional and their data is generated. The drug, condition and doctor information is real public reference data (FDA, National Library of Medicine, CMS). |
| Does the AI give medical advice? | No. It explains trends and labels in plain language, never diagnoses or changes doses, sends emergencies straight to 911 without calling the AI, and every screen says "not medical advice". |
| Why Tiger Data instead of a normal database? | Health data is time-series. Hypertables + continuous aggregates make "how has this changed?" questions instant, and compression fits a year of minute-level data for a family in 6 MB. |
| How does it connect to Apple Health? | The data model mirrors Apple HealthKit (each field maps to a HealthKit identifier). A native iOS app syncing real HealthKit data is our next step. |
| Are the doctors real? | Yes: licensed providers from the public NPI Registry. iCare suggests them; it doesn't endorse or book. |
| What did you build vs. use? | See the README: we built the app, data generator, all five public-data connectors, the Tiger schema/queries and the AI features; we used Next.js, Gemini, Tiger Data, Typesense, Coder and Vercel. |
| Does it work on Apple Watch? | Yes. `/watch` runs in the Watch's built-in web view (open the link from Messages): family status, alerts, next medicine, and a FaceTime audio check-in with the same AI agent. A native watchOS app with complications and notifications is the next step. |
| What's next? | Native iOS + HealthKit, clinician review of AI summaries, sharing a monthly report with your doctor, medication reminders (which would have caught Rosa's missed doses). |
