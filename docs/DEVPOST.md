# Devpost draft: IDoc

Working draft of our Emory Hacks 2026 submission. Copy each section into the matching Devpost field.

**Rules for editing this draft**
- Only claim what actually works on the live site. Lines marked **[WHEN BUILT]** describe planned features: keep them only if the feature works by submission, otherwise delete them or move them to "What's next".
- Owners: Cam keeps this file up to date. Each teammate updates their own feature's lines when it lands.
- Before submitting, check the prize rules at the sponsor tables and fill in the **[CHECK]** items.

---

## Project name
**IDoc**

## Tagline (short description, ~200 characters)
Your family's health, explained. AI-led wellness check-ins, plain-language medicine search, nearby specialists, and monthly and yearly health trends for everyone you care about.

## Try it out (links)
- Live app: https://idoc-wall-e9.vercel.app
- GitHub: https://github.com/GldnCh/EmoryHacks2026
- Demo video: **[ADD LINK]**

---

## Inspiration
Health information is everywhere, but it's scattered and hard to act on. Your watch counts steps and heart rate, your parents' medications live on a pill bottle in another city, and drug labels are written for pharmacists, not families. When something changes, like a parent's blood pressure creeping up, nobody notices until it becomes a problem.

We wanted one place where a family can see its health over time, understand it in plain language, and know who to talk to next.

## What it does
IDoc is a family telehealth companion. Our demo follows the **Rivera family**, a fictional family with a year of realistic health data:

- **Family health dashboard:** a year of Apple Health–style data (steps, resting heart rate, sleep, exercise, blood pressure, blood glucose) for every family member, including relatives who live far away. **[WHEN BUILT: dashboard UI]**
- **Minute-by-minute vitals:** zoom from a whole year down to a single day, hour by hour: heart rate while sleeping, during Sam's evening run, or through Jordan's flu week. **[WHEN BUILT: intraday chart UI]**
- **Monthly and yearly health trends:** the data rolls up into monthly trends, so changes stand out: Jordan's blood pressure falling from 138/88 to 126/81 after he started walking, or Grandma Rosa's spiking to 151/90 over the summer and recovering after a medication review. Gemini turns each month and year into a short, friendly report: a headline, 3–5 highlights, things worth asking a doctor about, and encouragement, all written from the real numbers.
- **Medicine search:** search by brand, generic name, misspelling or symptom ("zyrtec", "heartburn"). Every medicine shows official FDA label information, including boxed warnings, plus a plain-language explanation from MedlinePlus.
- **Specialist finder:** IDoc matches each person's conditions to the right kind of specialist and finds real, licensed doctors near them using the national NPI Registry. Rosa, in Savannah, gets local endocrinologists and cardiologists.
- **Condition explanations:** every condition on a profile links to a plain-language explanation from the National Library of Medicine.
- **AI wellness check-in:** a warm, one-question-at-a-time check-in about sleep, energy, pain, mood, medications and new symptoms, personalized with the person's own trends, ending with a short summary and a suggested next step ("mention the missed doses to your doctor"). Works as a chat on the `/checkin` page.
- **…over FaceTime (Chert):** FaceTime IDoc's number from an iPhone and the same check-in answers with an animated face and a natural Gemini voice. It asks who's calling (Jordan, Sam, Mia's parent or Grandma Rosa) and uses that person's data. **[CHECK: confirm a full FaceTime call works before demo day]**
- **Emergency safety net:** if anyone mentions chest pain, trouble breathing, stroke signs, fainting or suicidal thoughts, IDoc immediately tells them to call 911 (and 988), before the AI is even asked. In chat and on FaceTime.
- **Plain-language drug labels:** Gemini explains an official FDA label simply (what it's for, the boxed warning, key warnings, common side effects, questions to ask your pharmacist) using only the label's own text. **[WHEN BUILT: "Explain this label" button on the medicine page]**
- **Voice and image search (Typesense):** **[WHEN BUILT: describe if voice/image search ships]**

IDoc never diagnoses. It explains, tracks and points you to a professional, and every screen carries a "not medical advice" notice.

## How we built it
- **Next.js + TypeScript + Tailwind**, deployed on **Vercel**, developed in shared **Coder** workspaces.
- **Tiger Data (TimescaleDB)** is our only database, and it holds **profiles and metrics side by side**:
  - `family_members` (relational profiles: conditions, medications, location)
  - `health_metrics` hypertable (one row per person per day: sleep, blood pressure, glucose)
  - `vitals_minute` hypertable with **~2.1 million minute-by-minute heart-rate and step readings**, like an Apple Watch, in 7-day chunks
  - **3 continuous aggregates** (`vitals_hourly`, `vitals_daily`, `health_monthly`) with auto-refresh policies, so dashboards read pre-computed results instead of scanning millions of rows. Every API response reports its database time (`queryMs`): monthly trends, hourly vitals and cohort queries return in about 20 ms. **[CHECK: re-measure on the live Vercel site, which is in the same AWS region as the database]**
  - **Compression** segmented by family member. **212.3 MB → 6.2 MB (97% smaller)** across 53 compressed chunks.
  - One SQL query JOINs profiles with time-series trends: "show everyone in the family with hypertension and their monthly blood pressure."
  **[CHECK: confirm it's connected on the live site]**
- **Public medical data, no patient data:**
  - **openFDA** for official drug labels: uses, boxed warnings, side effects, interactions
  - **RxNorm** (National Library of Medicine) to turn brand names and typos into standard drug names
  - **MedlinePlus Connect** (NLM) for plain-language condition and drug explanations
  - **NLM Clinical Tables** for condition lookup with ICD-10 codes
  - **NPI Registry** (CMS) for real, licensed specialists by specialty and location
- **Typesense** for fast medicine search, indexed with RxNorm brand names and FDA "uses" text. **[CHECK: confirm it's seeded and used on the live site]**
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
- **[ADD as features land]**

## What we learned
- How much useful, free health data the U.S. government publishes (FDA, NLM, CMS), and how much cleanup it takes to make it family-friendly.
- How time-series databases make "how has this changed over the year?" questions fast and simple.
- **[ADD: team learnings]**

## What's next for IDoc
- A **native iOS app with live Apple HealthKit** data, instead of sample data
- **Clinician review** of AI summaries before they reach patients
- **Booking and sharing:** send a monthly summary to a chosen doctor, or book with a suggested specialist
- **Medication reminders and adherence tracking**, which would have caught Rosa's missed doses sooner
- Support for **more languages and reading levels**
- **[MOVE any unfinished features from "What it does" here]**

---

## Built with
`nextjs` `react` `typescript` `tailwindcss` `vercel` `coder` `tiger-data` `timescaledb` `postgresql` `typesense` `gemini` `gemini-live` `chert` `livekit` `openfda` `rxnorm` `medlineplus` `npi-registry`

## What we built vs. what we used (required by Emory Hacks)
**Built during the hackathon (after 8PM Fri Nov 13):**
- The IDoc app, its API routes and UI
- The Rivera family sample-data generator and medicine list
- Connectors for openFDA, RxNorm, MedlinePlus, Clinical Tables and the NPI Registry, including condition-to-specialist matching
- Tiger Data schema, seed script and trend queries; Typesense indexing with RxNorm/FDA enrichment
- Gemini AI layer: safety rules, red-flag check, summaries, check-in chat, label explanations, and the `/checkin` page
- The Chert FaceTime check-in agent (Gemini Live)
- **[ADD: dashboard UI]**

**Frameworks, libraries and services used (not built by us):**
Next.js, React, TypeScript, Tailwind CSS, Vercel, Coder, Tiger Data (TimescaleDB/PostgreSQL, `pg`), Typesense, Google Gemini API (incl. Gemini Live), Chert (`@trychert/facetime` and its video-agent starter), LiveKit Agents and LiveKit Cloud, openFDA, RxNorm/RxNav, MedlinePlus Connect, NLM Clinical Tables, NPI Registry.

## Prize tracks to select
- **Healthcare** track
- **Best Use of Tiger Data:** ~2.1M minute-level vitals in a hypertable; relational profiles and metric streams in one database; continuous aggregates powering lag-free dashboard charts; compression; measured raw-vs-aggregate speedups shown live in the demo (`/api/tiger/stats`). **[CHECK: sponsor's requirements]**
- **Best Use of Gemini API:** Gemini powers every AI feature, all behind one shared set of safety rules: (1) the **wellness check-in chat**, one question at a time, personalized with the person's Tiger Data trends, ending in a summary and next step; (2) **monthly and yearly health summaries** as validated JSON (headline, highlights, things to ask a doctor, encouragement) built from real numbers; (3) **plain-language FDA label explanations** that use only the label text and always keep boxed warnings; (4) **Gemini Live native audio** answering real iPhone **FaceTime** calls through Chert. **Safety guardrails:** an emergency red-flag check runs before Gemini (911/988 in ~10 ms), and the AI never diagnoses, never suggests medicines or doses, and always says it's not medical advice. **[CHECK: sponsor's submission requirements; confirm Gemini keys are set in Vercel]**
- **[CHECK: any other MLH prizes we qualify for, e.g. domain or DEV writing]**

## Team
- **Cam:** Lead, product and pitch
- **Ish:** AI and video (Chert + Gemini)
- **Jam:** search and backend (Typesense + Tiger Data)
- **TD:** frontend and Apple Health

---

## Pre-submit checklist (Sun 6:30–7:30AM)
- [ ] Every claim above works on https://idoc-wall-e9.vercel.app
- [ ] Every **[WHEN BUILT]**, **[CHECK]** and **[ADD]** marker is resolved or deleted
- [ ] Demo video uploaded and linked (backup in case the live demo fails)
- [ ] All teammates added to the Devpost submission
- [ ] Prize tracks selected, and each sponsor's extra requirements met
- [ ] README "What we built vs. what we used" matches this page
- [ ] Submitted by **7:30AM** (hard deadline 8AM)
