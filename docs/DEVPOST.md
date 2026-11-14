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
- **Monthly and yearly health trends:** the data rolls up into monthly trends, so changes stand out: Jordan's blood pressure falling from 138/88 to 126/81 after he started walking, or Grandma Rosa's spiking to 151/90 over the summer and recovering after a medication review. **[WHEN BUILT: Gemini-written plain-language summaries]**
- **Medicine search:** search by brand, generic name, misspelling or symptom ("zyrtec", "heartburn"). Every medicine shows official FDA label information, including boxed warnings, plus a plain-language explanation from MedlinePlus.
- **Specialist finder:** IDoc matches each person's conditions to the right kind of specialist and finds real, licensed doctors near them using the national NPI Registry. Rosa, in Savannah, gets local endocrinologists and cardiologists.
- **Condition explanations:** every condition on a profile links to a plain-language explanation from the National Library of Medicine.
- **AI wellness check-in over FaceTime (Chert):** **[WHEN BUILT: describe how the Chert video check-in works]**
- **Voice and image search (Typesense):** **[WHEN BUILT: describe if voice/image search ships]**

IDoc never diagnoses. It explains, tracks and points you to a professional, and every screen carries a "not medical advice" notice.

## How we built it
- **Next.js + TypeScript + Tailwind**, deployed on **Vercel**, developed in shared **Coder** workspaces.
- **Tiger Data (TimescaleDB)** stores each family member's daily health history in a hypertable. Monthly and weekly trends are computed in the database with `time_bucket()`. **[CHECK: confirm it's connected on the live site]**
- **Public medical data, no patient data:**
  - **openFDA** for official drug labels: uses, boxed warnings, side effects, interactions
  - **RxNorm** (National Library of Medicine) to turn brand names and typos into standard drug names
  - **MedlinePlus Connect** (NLM) for plain-language condition and drug explanations
  - **NLM Clinical Tables** for condition lookup with ICD-10 codes
  - **NPI Registry** (CMS) for real, licensed specialists by specialty and location
- **Typesense** for fast medicine search, indexed with RxNorm brand names and FDA "uses" text. **[CHECK: confirm it's seeded and used on the live site]**
- **Google Gemini** **[WHEN BUILT: what Gemini does: check-in conversation, summaries]**
- **Chert** **[WHEN BUILT: how the FaceTime integration works]**
- The Rivera family's data is **generated deterministically**, so every teammate, and the judges, see identical numbers. Each person's year tells a story the app can surface: a new walking routine, a flu week, a stressful work stretch, a medication review.

## Challenges we ran into
- **Medical data without patient data.** Real health records are off-limits, so we built a fictional family whose year of data contains realistic, explainable patterns, and paired it with public reference databases that describe drugs, conditions and doctors rather than people.
- **Messy public data.** The NPI Registry matches a city on any address, including mailing PO boxes, so we filter to where doctors actually practice. openFDA returns many labels per drug, and some for drugs no longer sold, so we deduplicate and label everything as reference only.
- **Team setup in 36 hours.** We onboarded four people onto shared cloud dev environments, a protected `main` branch with pull requests, and auto-deploys from day one.
- **[ADD: Chert / Gemini challenges as they happen]**

## Accomplishments that we're proud of
- Five public health databases working together behind one simple app, with no API keys needed for them.
- Specialist suggestions that are real, licensed doctors near each family member.
- Safety built in from the start: no real patient data, FDA warnings shown prominently, and "not medical advice" everywhere.
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
`nextjs` `react` `typescript` `tailwindcss` `vercel` `coder` `tiger-data` `timescaledb` `postgresql` `typesense` `gemini` `chert` `openfda` `rxnorm` `medlineplus` `npi-registry`

## What we built vs. what we used (required by Emory Hacks)
**Built during the hackathon (after 8PM Fri Nov 13):**
- The IDoc app, its API routes and UI
- The Rivera family sample-data generator and medicine list
- Connectors for openFDA, RxNorm, MedlinePlus, Clinical Tables and the NPI Registry, including condition-to-specialist matching
- Tiger Data schema, seed script and trend queries; Typesense indexing with RxNorm/FDA enrichment
- **[ADD: Chert check-in, Gemini summaries, dashboard UI]**

**Frameworks, libraries and services used (not built by us):**
Next.js, React, TypeScript, Tailwind CSS, Vercel, Coder, Tiger Data (TimescaleDB/PostgreSQL, `pg`), Typesense, Google Gemini API, Chert, openFDA, RxNorm/RxNav, MedlinePlus Connect, NLM Clinical Tables, NPI Registry.

## Prize tracks to select
- **Healthcare** track
- **Best Use of Tiger Data:** health history stored as a hypertable, with trends via `time_bucket()`. **[CHECK: sponsor's requirements]**
- **Best Use of Gemini API** **[CHECK: only if Gemini is live in the demo; describe exactly how it's used]**
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
