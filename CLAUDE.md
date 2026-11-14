# IDoc — Emory Hacks 2026

IDoc is a family telehealth platform: AI-led wellness check-ins over Chert's iPhone FaceTime feature, medicine search by text/voice/image, nearby specialists, family health tracking, and monthly and yearly health summaries.

Built at **Emory Hacks 2026** (Healthcare track), Fri Nov 13 to Sun Nov 15, 2026.

- **Live app:** https://idoc-wall-e9.vercel.app (Vercel project `idoc`, team Wall-E, owner: Cam). Every merge to `main` redeploys it; each PR gets a preview link. The site is public.
- **Repo:** https://github.com/GldnCh/EmoryHacks2026 (public)
- **New teammate?** Follow **[QUICKSTART.md](QUICKSTART.md)**: browser only, about 10 minutes. Everyone works in a **Coder workspace** (https://coder.c1.workshop.cdr.dev/) where Git, GitHub CLI, Node 22 and Claude Code are pre-installed.

## Event rules (do not break these)
- All project code must be written **after 8PM Fri Nov 13**. Do not reuse code from older projects.
- Frameworks, libraries and APIs are allowed, but **every one must be credited in the README** under "What we built vs. what we used". Add an entry whenever you add a dependency.
- Submit by **7:30AM Sun Nov 15**. Hard deadline 8AM, judging expo 8:15AM, finalist demos 10:15AM.
- Each sponsor prize (Gemini, Tiger Data) has its own rules. Check them before opting in.

## Team
| Person | Role | Owns |
|---|---|---|
| **Cam** | Lead / Product & Pitch | Scope and priorities, PR reviews and merges, README, Devpost, demo, Vercel, Tiger Data account |
| **Ish** | AI & Video Engineer | Chert FaceTime check-ins, Gemini prompts, check-in and summary logic, safety wording |
| **Jam** | Search & Backend Engineer | Typesense search, Tiger Data queries, API routes, sample data |
| **TD** | Frontend & Apple Health Engineer | App screens, dashboard and charts, design, mobile layout, testing. **Holds the team's API keys** |

When asked to do work, keep inside the requester's area. If a change touches someone else's area, say so, so they can be looped in.

## Features
Priority order. **Core** features make the demo; the rest are **stretch**. Cam has the final say on scope. If time runs short, drop from the bottom up.

| # | Feature | Owner | Priority | Backend status |
|---|---|---|---|---|
| 1 | AI-led wellness check-in over Chert FaceTime (Gemini) | Ish | Core | Not started; needs Chert docs |
| 2 | Medicine search (text now; voice/image via Typesense) | Jam | Core | ✅ `/api/medicines/search`, `/api/medicines/<name>` |
| 3 | Monthly and yearly health summaries (Gemini) | Ish + TD | Core | Data ready: `/api/trends/<id>`, `/api/family/<id>/profile` |
| 4 | Health dashboard with Apple Health-style data | TD | Core | Data ready: `/api/trends/<id>`, `/api/vitals/<id>`, `/api/tiger/stats` |
| 5 | Find specialists in your area | Jam + TD | Stretch | ✅ `/api/specialists` |
| 6 | Connect with providers for long-distance tracking | Jam | Stretch | Data ready: `/api/tiger/cohort` |
| 7 | Family health tracking | Jam + TD | Stretch | ✅ `/api/sample/family`, `/api/family/<id>/profile` |
| 8 | Live Apple HealthKit (native iOS app) | TD | Stretch | Pitch as the next step |

No screens exist yet beyond the home page: the next work is UI on top of these routes.

## Tech stack
Teammates can add tools; add each one here and to the README credits.

- **App + backend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS; API routes in `src/app/api/`
- **Database:** Tiger Data / TimescaleDB (`pg`), our only database. Profiles, daily metrics and ~2.1M minute-level vitals; continuous aggregates; compression. Code: `src/lib/tiger.ts`, `src/lib/tiger-ca.ts`, `db/tiger/schema.sql`. Routes fall back to sample data when `TIGER_DATABASE_URL` isn't set
- **AI:** Google Gemini (`@google/genai`), client in `src/lib/gemini.ts`
- **Search:** Typesense Cloud (`typesense`), client in `src/lib/typesense.ts`
- **Public medical data (no keys):** openFDA, RxNorm, MedlinePlus, NLM Clinical Tables, NPI Registry in `src/lib/medical/`. See `docs/MEDICAL-DATA.md`
- **Patients:** only the fabricated Rivera family in `src/lib/sample-data/health.ts`. See `docs/SAMPLE-DATA.md`. Never real patient data
- **Video check-ins:** Chert. Follow Chert's official docs and SDK; never guess its API
- **Dev environment:** Coder · **Hosting:** Vercel (region iad1, same AWS region as the database)

## Working in this repo
- **Run:** `npm run dev`. In Coder it starts on **port 3001** (3000 is taken); open it from code-server's **Ports** tab. Check keys at `/api/health`.
- **Before opening a PR:** `npm run lint` and `npm run build` must pass, and test the routes/pages you touched.
- **Data scripts:** `npm run seed:tiger` (Cam; database already loaded), `npm run seed:typesense` (loads medicines into Typesense).
- **Keys:** `.env.local` (copy of `.env.example`). **TD has the team's API keys**; **Cam has `TIGER_DATABASE_URL`**. Get values from them privately. Production keys live in Vercel (**Project → Settings → Environment Variables**, sensitive type), and Cam adds them. See `docs/API-KEYS.md`.
- **TLS:** never "fix" a database certificate error by disabling verification; use `tigerConnectionConfig()` from `src/lib/tiger-ca.ts`.

## Git workflow
- **Never push straight to `main`** (it's protected).
- Start each session by pulling `main`, then work on a branch named `<name>/<feature>`, e.g. `td/dashboard`, `ish/checkup`.
- Commit small and often with clear messages. Pull `main` into your branch often.
- Open a **pull request into `main`**. Cam reviews and merges; if Cam is unavailable, any teammate can approve. Check the PR's Vercel preview link before asking for review.

## Safety and privacy rules
- **Never commit secrets.** Keys go in `.env.local` (git-ignored). `.env.example` has names only. Never put secrets in `NEXT_PUBLIC_` variables.
- **No real patient or personal health data.** Only the fabricated Rivera family.
- All AI health output must say it is **not medical advice** and recommend a clinician for anything serious.
- AI must never invent diagnoses, doses or drugs. When unsure, say so and point to a professional. Show the `disclaimer` the medical routes return.

## Schedule
| When | Goal |
|---|---|
| Sat (all day and night) | **No feature freeze** (Lead decision): build and merge features. Update `docs/DEVPOST.md` as features land |
| Sat evening | Record a backup demo video of what works, rehearse the pitch |
| **Sun 6:30AM** | **Last merge to `main`.** After this, only fixes for anything broken on the live site |
| Sun 6:30–7:30AM | Check every feature on the live site, finalize Devpost |
| **Sun 7:30AM** | **Submit** (hard deadline 8AM) |
