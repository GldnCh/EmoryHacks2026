# Devpost draft: iCare

Working draft of our Emory Hacks 2026 submission. Copy each section into the matching Devpost field.

**Rules for editing this draft**
- Only claim what actually works on the live site. Lines marked **[WHEN BUILT]** describe planned features: keep them only if the feature works by submission, otherwise delete them or move them to "What's next".
- Owners: Cam keeps this file up to date. Each teammate updates their own feature's lines when it lands.
- Before submitting, check the prize rules at the sponsor tables and fill in the **[CHECK]** items.

## Submission status on Devpost (updated by Cam's Claude, Sat Nov 14 night)
**Status: SUBMITTED (5/5 steps).** We can keep editing until the 8 AM deadline. Edit: Emory Hacks 2026 → **My projects** → **iCare** → Edit (Cam's account).

| Field | State |
|---|---|
| Name / elevator pitch | ✅ **iCare** / "Your family's health, explained..." |
| About the project | ✅ Updated Sat night: What it does (family sharing, reminders, alerts, doctor report, search by photo, saved FaceTime check-ins, installable app), Accomplishments, What we learned, and the expanded What's next |
| Built with | ✅ 22 tags (added chert, livekit, gemini-live, pwa, apple-watch) |
| Try it out | ✅ Desktop, iPhone (/iphone) and Apple Watch (/apple-watch) links + GitHub |
| Video demo link | ✅ https://youtu.be/5OxAAXvU8ZU (unlisted, 2:52, added Sun Nov 15) |
| Judging title / track | ✅ iCare / Healthcare |
| Prize opt-ins | ✅ Tiger Data, Coder (1st + 2nd), Typesense, Gemini, **Chert (a full FaceTime call worked, so keep it)** |
| Gemini Project Number | ⚠️ Optional field for the Gemini prize: AI Studio → API key → Project Number |
| Gen-AI question | ✅ Answered (Claude Code for development; Gemini live in the app; Chert FaceTime agent with Gemini Live working) |

**Before 7:30 AM Sun:** re-check every claim against the live site, paste the updated sections into Devpost, and add the demo video link below if it changed.


**When Ish's check-in merges:** update the About story (What it does, How we built it), the gen-AI answer and the Gemini/Chert prize decisions, then resolve the markers below.

---

## Project name
**iCare**

## Tagline (short description, ~200 characters)
Your family's health, explained: AI FaceTime check-ins (Chert, LiveKit, Gemini Live), voice and photo medicine search (Typesense), and alerts on iPhone and Apple Watch, powered by Tiger Data.

## Try it out (links)
- Live app (desktop): https://icare-wall-e9.vercel.app
- iPhone view: https://icare-wall-e9.vercel.app/iphone (the app in an iPhone frame; opens the app directly on a real iPhone)
- Apple Watch view: https://icare-wall-e9.vercel.app/apple-watch (the watch view in a watch frame; on a real Apple Watch open https://icare-wall-e9.vercel.app/watch from Messages)
- GitHub: https://github.com/GldnCh/EmoryHacks2026
- Demo video: **https://youtu.be/5OxAAXvU8ZU**

---

## Inspiration
Health information is everywhere, but it's scattered and hard to act on. Your watch counts steps and heart rate, your parents' medications live on a pill bottle in another city, and drug labels are written for pharmacists, not families. When something changes, like a parent's blood pressure creeping up, nobody notices until it becomes a problem.

We wanted one place where a family can see its health over time, understand it in plain language, and know who to talk to next.

## What it does
iCare is a family telehealth companion. Our demo follows the **Rivera family**, a fictional family with a year of realistic health data:

- **Family health dashboard:** a year of Apple Health–style data (steps, resting heart rate, sleep, exercise, blood pressure, blood glucose) for every family member, including relatives who live far away. The dashboard shows one card per person with their latest monthly averages, each marked green or amber with an arrow for better or worse than the month before.
- **Family sharing, like Apple Family Sharing but per person:** iCare is built as an iPhone app, so the phone is the identity: no sign-in, nothing expires. Family members connect by request and accept and choose what each other sees: **Full**, **Health summary** or **Basic** ("doing okay" plus important alerts), with **guardians** for kids and aging parents. Either side can disconnect, with clear warnings. The dashboard only shows the people you're connected to, at the level they share, and the server checks every request.
- **Medication reminders and dose tracking:** each person's schedule from their prescription label, a one-tap **Taken** button, and a 7-day history. Guardians can log doses for a parent or child. Rosa's card shows she missed her evening pills twice this week. iCare never suggests doses; it only records what the label says and what was taken.
- **Family alerts:** iCare tells the right people when something needs attention: missed doses, blood pressure running high, and, most important, a check-in (including a FaceTime call) where someone mentioned emergency symptoms. Each person sees only the detail their sharing level allows. A Basic connection just gets "Rosa may need help. Consider calling her."
- **Doctor report:** a one-page report to print or save as PDF before a visit: conditions, medicines, how many doses were taken over 30 days, a year of monthly averages, recent check-ins and alerts. Gemini adds a short overview and **questions to ask the doctor**, written only from the numbers in the report.
- **Minute-by-minute vitals:** zoom from a whole year down to a single day, hour by hour: heart rate while sleeping, during Sam's evening run, or through Jordan's flu week. Each person's page has a date picker that charts any day's hourly heart rate (average plus lowest-to-highest range) and steps, read from Tiger Data's hourly continuous aggregate.
- **Monthly and yearly health trends:** the data rolls up into monthly trends, so changes stand out: Jordan's blood pressure falling from 138/88 to 126/81 after he started walking, or Grandma Rosa's spiking to 151/90 over the summer and recovering after a medication review. Gemini turns each month and year into a short, friendly report: a headline, 3–5 highlights, things worth asking a doctor about, and encouragement, all written from the real numbers.
- **Medicine search:** search by brand, generic name, misspelling or symptom ("zyrtec", "heartburn"). Every medicine shows official FDA label information, including boxed warnings, plus a plain-language explanation from MedlinePlus.
- **Specialist finder:** iCare matches each person's conditions to the right kind of specialist and finds real, licensed doctors near them using the national NPI Registry. Rosa, in Savannah, gets local endocrinologists and cardiologists.
- **Condition explanations:** every condition on a profile links to a plain-language explanation from the National Library of Medicine.
- **AI wellness check-in:** a warm, one-question-at-a-time check-in about sleep, energy, pain, mood, medications and new symptoms, personalized with the person's own trends, ending with a short summary and a suggested next step ("mention the missed doses to your doctor"). Works as a chat on the `/checkin` page.
- **…over FaceTime (Chert):** FaceTime iCare's number from an iPhone and the same check-in answers with an animated face and a natural Gemini voice. It asks who's calling (Jordan, Sam, Mia's parent or Grandma Rosa) and uses that person's data. Emergency phrases heard on the call are checked by the same red-flag check and get the 911/988 message.
- **Emergency safety net:** if anyone mentions chest pain, trouble breathing, stroke signs, fainting or suicidal thoughts, iCare immediately tells them to call 911 (and 988), before the AI is even asked. In chat and on FaceTime.
- **Plain-language drug labels:** Gemini explains an official FDA label simply (what it's for, the boxed warning, key warnings, common side effects, questions to ask your pharmacist) using only the label's own text, from the "Explain this label simply" button on every medicine page.
- **Voice search:** tap the microphone on the Medicines page and say a drug name or symptom; the browser's speech recognition turns it into a search (shown on browsers that support it, such as Chrome and Safari).
- **Search by photo:** tap the camera on the Medicines page and photograph a medicine box or pill-bottle label. Gemini reads only the drug name printed on the label, and iCare runs the normal search with it. For safety it never identifies loose pills by their shape, color or imprint (it asks for a photo of the label instead), never returns doses or advice, and never stores the photo.
- **Works on Apple Watch:** glance at the family (whoever needs a look comes first), tap a person for their alerts and next medicine, and start the AI check-in with a FaceTime audio call from your wrist. We tested it on a real Apple Watch: the call reached our Chert agent and the summary saved to Tiger Data. Shareable views: `/iphone` and `/apple-watch`.

iCare never diagnoses. It explains, tracks and points you to a professional, and every screen carries a "not medical advice" notice.

## How we built it
- **Next.js + TypeScript + Tailwind**, deployed on **Vercel**, developed in shared **Coder** workspaces.
- **Tiger Data (TimescaleDB)** is our only database, and it holds **profiles and metrics side by side**:
  - `family_members` (relational profiles: conditions, medications, location)
  - `health_metrics` hypertable (one row per person per day: sleep, blood pressure, glucose)
  - `vitals_minute` hypertable with **~2.1 million minute-by-minute heart-rate and step readings**, like an Apple Watch, in 7-day chunks
  - **3 continuous aggregates** (`vitals_hourly`, `vitals_daily`, `health_monthly`) with auto-refresh policies, so dashboards read pre-computed results instead of scanning millions of rows. Every API response reports its database time (`queryMs`). On the live site (Vercel and Tiger Cloud both in AWS us-east-1), monthly trends, weekly trends, hourly vitals and cohort queries return in **2–4 ms**, and a full year of daily heart rate comes back in **~3 ms from the continuous aggregate vs ~22 ms from the 525,600 raw minute rows (~7.5× faster)**.
  - **Compression** segmented by family member. **212.3 MB → 6.2 MB (97% smaller)** across 53 compressed chunks.
  - One SQL query JOINs profiles with time-series trends: "show everyone in the family with hypertension and their monthly blood pressure."
  Live and verified: `/api/tiger/stats` on the deployed site reports all 2,102,400 rows, 53/53 compressed chunks and the benchmark in real time.
- **Public medical data, no patient data:**
  - **openFDA** for official drug labels: uses, boxed warnings, side effects, interactions
  - **RxNorm** (National Library of Medicine) to turn brand names and typos into standard drug names
  - **MedlinePlus Connect** (NLM) for plain-language condition and drug explanations
  - **NLM Clinical Tables** for condition lookup with ICD-10 codes
  - **NPI Registry** (CMS) for real, licensed specialists by specialty and location
- **Typesense** for fast, typo-tolerant medicine search: our 38 medicines indexed with every RxNorm brand name (so a store brand like "Wal-Zyr" finds cetirizine) and the official FDA "uses" text. Results update as you type (about 20 ms per search on Typesense), with filter chips for prescription vs. over the counter and drug class, and the matched words highlighted. If Typesense is ever unreachable, search quietly falls back to our local list so the demo never breaks.
- **Google Gemini** (`gemini-3.5-flash-lite`, ~0.5–1.5 s per reply) writes the monthly/yearly summaries, runs the check-in chat and explains FDA labels. Every call shares one set of safety rules (plain 6th–8th grade language, not medical advice, no diagnoses, no medication or dose changes, say when unsure) and returns validated JSON. Month-over-month changes are computed in code, so the AI never does the math. Summaries are cached so repeated demo clicks are instant.
- **Safety before AI:** a red-flag check scans what the person says for emergency phrases and answers with the 911/988 message in ~10 ms without calling Gemini. It handles negations, so "no chest pain" doesn't trigger it.
- **Chert + LiveKit + Gemini Live:** Chert bridges an iPhone FaceTime call into a LiveKit room, where our agent (built from Chert's video starter, swapped from OpenAI to **Gemini Live native audio**) talks with the caller. It loads the same safety rules, check-in steps and Tiger Data trends from our API, so chat and voice can't drift apart, and runs every sentence the caller says through our emergency check.
- The Rivera family's data is **generated deterministically**, so every teammate, and the judges, see identical numbers. Each person's year tells a story the app can surface: a new walking routine, a flu week, a stressful work stretch, a medication review.

## Challenges we ran into
- **Medical data without patient data.** Real health records are off-limits, so we built a fictional family whose year of data contains realistic, explainable patterns, and paired it with public reference databases that describe drugs, conditions and doctors rather than people.
- **Messy public data.** The NPI Registry matches a city on any address, including mailing PO boxes, so we filter to where doctors actually practice. openFDA returns many labels per drug, and some for drugs no longer sold, so we deduplicate and label everything as reference only.
- **Team setup in 36 hours.** We onboarded four people onto shared cloud dev environments, a protected `main` branch with pull requests, and auto-deploys from day one.
- **Safety vs. friendliness.** A keyword emergency check is easy; one that doesn't send someone to the ER for saying "no chest pain" during a check-in is not. We handle negation in the same clause and still err toward safety.
- **The FDA data surprised us.** Searching openFDA for "lisinopril" or "metformin" can return a combination product's label. Our label explainer flags this instead of quietly explaining the wrong medicine.
- **Real FaceTime is hard.** Getting an AI onto an actual iPhone FaceTime call meant learning LiveKit agents, Chert's 10-second greeting rule, and swapping the starter from OpenAI to Gemini Live (and finding which Gemini SDK version supports Live on our key).

## Accomplishments that we're proud of
- Five public health databases working together behind one simple app, with no API keys needed for them.
- Specialist suggestions that are real, licensed doctors near each family member.
- Safety built in from the start: no real patient data, FDA warnings shown prominently, and "not medical advice" everywhere.
- Safety that doesn't depend on the AI behaving: emergency phrases are caught in code before Gemini is called, and boxed FDA warnings are always shown word for word even if the AI leaves them out.
- One set of prompts and safety rules shared by the chat and the FaceTime agent.
- Fitting a year of minute-by-minute vitals for a whole family (2.1M readings) into 6.2 MB, with every dashboard query answering in a few milliseconds.
- Privacy by design: every health route checks who is asking and what that person shares with them, and alerts give Basic connections a nudge to call without revealing any health details.
- Search by photo that refuses to identify a loose pill from how it looks: Gemini only copies the name printed on a label, and the server enforces it.
- An installable app (Add to Home Screen) whose offline cache never stores anyone's health data.
- A doctor report where the numbers that matter (like the highest blood pressure month) are worked out in code and handed to Gemini, so the AI can't mix up months.

## What we learned
- How much useful, free health data the U.S. government publishes (FDA, NLM, CMS), and how much cleanup it takes to make it family-friendly.
- How time-series databases make "how has this changed over the year?" questions fast and simple.
- Design permissions first: once every health route asked "who is asking, and what do they share with them?", new features (reminders, alerts, reports) got privacy almost for free.
- AI is most accurate when code does the math: giving Gemini precomputed changes and peak months fixed mistakes that prompting alone didn't.
- Real-time voice is unforgiving: a FaceTime agent has 10 seconds to speak, and everything it draws or checks shares the same moment as the caller's audio.

## What's next for iCare
- **Smarter, more human AI conversations:** we plan to build on conversational AI research tools from **Professor Jinho Choi** (Emory NLP) to make iCare's check-ins feel more natural: remembering context across calls, asking better follow-up questions, and noticing when someone needs more support.
- **Mental health, for a whole-person view of health:** regular mood, stress and sleep check-ins alongside physical health, trends that show when someone has been struggling for a while, gentle encouragement to reach out, and a direct path to the 988 Suicide & Crisis Lifeline and to a clinician. iCare would support, never diagnose or replace therapy.
- **Prevention for common conditions, using Apple's health data:** condition-specific features that turn data people already collect into early warnings:
  - **Asthma:** combine respiratory rate, blood oxygen, sleep and activity from Apple Watch with local air quality and pollen, and logged inhaler use, to flag tough days before they turn into attacks.
  - **Diabetes:** connect glucose readings from glucose monitors that write to Apple Health, and show how meals, activity and sleep relate to highs and lows, with reminders for regular lab checks like A1C.
  - **High blood pressure and heart health:** readings from connected blood-pressure cuffs, plus Apple Watch heart notifications, to spot a rise like Rosa's summer spike weeks earlier.
- **Native iOS app with live Apple HealthKit:** real data from Apple Health and Apple Watch replaces our sample data, and the iPhone stays the identity, with no sign-in.
- **Real reminders on iPhone and Apple Watch:** medicine reminders as notifications, a "Taken" tap from the watch, and a nudge to a guardian when a dose is missed.
- **Apple Watch safety signals in family alerts:** with permission, fall detection, irregular rhythm and high or low heart rate notifications flow into family alerts, at the detail each person's sharing level allows.
- **FaceTime check-ins that know who's calling:** a call from a family member's own iPhone arrives already linked to them, with no "who's calling?", and the next check-in follows up on last time, using summaries only.
- **Closing the loop with clinicians:** send the doctor report to the clinic through a secure link that expires, clinician review of AI summaries, and real records from patient portals through standard health-data connections (FHIR).
- **Booking and refills:** request appointments with suggested specialists (with in-network filters), and refill reminders when a prescription is running low.
- **Built for every generation:** Spanish and more languages, simpler reading levels, and a voice-first, large-text mode for grandparents like Rosa.
- **Privacy you can see:** each person can see their own activity log ("who looked at my health and when"), with healthcare-grade security and encrypted check-in summaries.
- **Testing with real families:** a pilot with families and caregivers, and clinicians reviewing our safety rules before anyone relies on iCare.

---

## Built with
`nextjs` `react` `typescript` `tailwindcss` `vercel` `coder` `tiger-data` `timescaledb` `postgresql` `typesense` `gemini` `gemini-live` `chert` `livekit` `openfda` `rxnorm` `medlineplus` `npi-registry` `pwa` `apple-watch`

## What we built vs. what we used (required by Emory Hacks)
**Built during the hackathon (after 8PM Fri Nov 13):**
- The iCare app, its API routes and UI
- The Rivera family sample-data generator and medicine list
- Connectors for openFDA, RxNorm, MedlinePlus, Clinical Tables and the NPI Registry, including condition-to-specialist matching
- Tiger Data schema, seed script and trend queries; Typesense indexing with RxNorm/FDA enrichment
- Medicine search (Typesense, filters, voice search) and the medicine detail and specialist finder pages
- App shell, family dashboard, per-person trend and day-view charts, and the Tiger Data page (TD)
- Medicine search on Typesense, medicine detail pages with FDA boxed warnings, and the specialist finder (Jam)
- Gemini AI layer: safety rules, red-flag check, summaries, check-in chat, label explanations, and the `/checkin` page (Ish)
- The Chert FaceTime check-in agent (Gemini Live) with its animated heart, saved check-in summaries and the "Start FaceTime call" button (Ish, TD)
- Search by photo: Gemini reads the printed drug name from a label photo, then the normal search runs (Jam)
- Family sharing (iPhone as identity, request and accept, Full / Health summary / Basic, guardians), medication reminders and dose tracking, family alerts, and the doctor report (Cam)
- Health-app style redesign and the installable app (PWA) (TD)

**Frameworks, libraries and services used (not built by us):**
Next.js, React, TypeScript, Tailwind CSS, Vercel, Coder, Tiger Data (TimescaleDB/PostgreSQL, `pg`), Typesense, Google Gemini API (incl. Gemini Live), Chert (`@trychert/facetime` and its video-agent starter), LiveKit Agents and LiveKit Cloud, openFDA, RxNorm/RxNav, MedlinePlus Connect, NLM Clinical Tables, NPI Registry.

## Prize tracks to select
- **Healthcare** track
- **Best Use of Tiger Data:** 2.1M minute-level vitals in a hypertable; relational profiles and metric streams side by side in one database (one SQL JOIN for "everyone with hypertension and their monthly BP"); 3 continuous aggregates powering lag-free dashboard charts (2–4 ms); **97% compression (212.3 MB → 6.2 MB)**; and a live raw-vs-aggregate benchmark (~22 ms vs ~3 ms) shown in the demo. The same database also holds the app's own data (accounts, sharing, connection requests, medicine schedules, dose logs and FaceTime check-in summaries), so alerts and doctor reports join health trends with app data in one place.
- **Best Use of Gemini API:** Gemini powers every AI feature, all behind one shared set of safety rules: (1) the **wellness check-in chat**, one question at a time, personalized with the person's Tiger Data trends, ending in a summary and next step; (2) **monthly and yearly health summaries** as validated JSON (headline, highlights, things to ask a doctor, encouragement) built from real numbers; (3) **plain-language FDA label explanations** that use only the label text and always keep boxed warnings; (4) **Gemini Live native audio** answering real iPhone **FaceTime** calls through Chert, with each call summarized and saved; (5) the **doctor report** overview and questions to ask the doctor, from numbers computed in code; (6) **search by photo**, where Gemini reads only the printed drug name from a label photo and refuses loose pills. **Safety guardrails:** an emergency red-flag check runs before Gemini (911/988 in ~10 ms), and the AI never diagnoses, never suggests medicines or doses, and always says it's not medical advice. Gemini keys are set in Vercel (Production + Preview) and all routes are live.

## Team
- **Cam:** Lead, product and pitch
- **Ish:** AI and video (Chert + Gemini)
- **Jam:** search and backend (Typesense + Tiger Data)
- **TD:** frontend and Apple Health

---

## Pre-submit checklist (Sun 6:30–7:30AM)
- [ ] Every claim above works on https://icare-wall-e9.vercel.app
- [ ] Every **[WHEN BUILT]**, **[CHECK]** and **[ADD]** marker is resolved or deleted
- [x] Demo video uploaded and linked (backup in case the live demo fails)
- [ ] All teammates added to the Devpost submission
- [ ] Prize tracks selected, and each sponsor's extra requirements met (re-read the Tiger Data and Gemini prize pages; add the Gemini Project Number on Devpost: AI Studio → API key → Project Number)
- [ ] Checked the MLH prize list for any other prize we qualify for
- [ ] README "What we built vs. what we used" matches this page
- [ ] Submitted by **7:30AM** (hard deadline 8AM)
