# iCare — Emory Hacks 2026

iCare is a family telehealth platform: AI-led wellness check-ins over Chert's iPhone FaceTime feature, medicine search by text/voice/image, nearby specialists, family health tracking, and monthly and yearly health summaries.

Built at **Emory Hacks 2026** (Healthcare track), Fri Nov 13 to Sun Nov 15, 2026.

- **Live app:** https://icare-wall-e9.vercel.app (Vercel project `idoc`, team Wall-E, owner: Cam). Every merge to `main` redeploys it; each PR gets a preview link. The site is public.
- **Repo:** https://github.com/GldnCh/EmoryHacks2026 (public)
- **Name:** the project is **iCare** (renamed from "IDoc" on Sat Nov 14). Use "iCare" in all UI, AI wording, docs and Devpost. A few **technical IDs keep the old name on purpose** (renaming them would break existing setups): Vercel project `idoc` (old URL https://idoc-wall-e9.vercel.app still works), Tiger Data service `idoc` and read-only role `idoc_team`, the Chert agent name `idoc-checkin`, and the `IDOC_API_URL` variable in `chert-agent/`. Coder workspaces created before the rename may be called `idoc-<name>`; that's fine.
- **New teammate?** Follow **[QUICKSTART.md](QUICKSTART.md)** (browser only, about 10 minutes), then paste your task prompt from **[docs/TEAM-PROMPTS.md](docs/TEAM-PROMPTS.md)**, which also lists who owns which files. Everyone works in a **Coder workspace** (https://coder.c1.workshop.cdr.dev/) where Git, GitHub CLI, Node 22 and Claude Code are pre-installed.

## Event rules (do not break these)
- All project code must be written **after 8PM Fri Nov 13**. Do not reuse code from older projects.
- Frameworks, libraries and APIs are allowed, but **every one must be credited in the README** under "What we built vs. what we used". Add an entry whenever you add a dependency.
- Submit by **7:30AM Sun Nov 15**. Hard deadline 8AM, judging expo 8:15AM, finalist demos 10:15AM.
- Each sponsor prize (Gemini, Tiger Data) has its own rules. Check them before opting in.

## Team
| Person | Role | Owns |
|---|---|---|
| **Cam** | Lead / Product & Pitch | Scope and priorities, PR reviews and merges, keys, Vercel, Tiger Data account, Devpost, demo video |
| **Ish** | AI & Video Engineer | Chert FaceTime check-ins, Gemini prompts, check-in and summary logic, safety wording |
| **Jam** | Search & Backend Engineer | Typesense search, Tiger Data queries, API routes, sample data |
| **TD** | Frontend & Apple Health Engineer | App shell, dashboard and charts, design system and shared components, mobile layout, testing |

When asked to do work, keep inside the requester's area. If a change touches someone else's area, say so, so they can be looped in.

## Features
Priority order. **Core** features make the demo; the rest are **stretch**. Cam has the final say on scope. If time runs short, drop from the bottom up.

| # | Feature | Owner | Priority | Status on the live site |
|---|---|---|---|---|
| 1 | AI wellness check-in (Gemini), in the browser and over Chert FaceTime | Ish | Core | ✅ Live: `/checkin` chat + red-flag check. ⚠️ Chert FaceTime agent (`chert-agent/`, runs separately in Coder) is connected but a full call is not yet confirmed |
| 2 | Medicine search (Typesense, typo-tolerant, voice) + medicine pages with FDA boxed warnings and Gemini "Explain this label simply" | Jam + Ish | Core | ✅ Live: `/medicines`, `/medicines/<name>`, `/api/ai/explain-label`. Photo search: not built |
| 3 | Monthly and yearly health summaries (Gemini) | Ish | Core | ✅ Live: `/checkin` summary panel, `/api/ai/summary/<id>?period=month\|year` |
| 4 | Family health dashboard, 12-month trends, hour-by-hour day view | TD | Core | ✅ Live: `/dashboard`, `/family/<id>` |
| 5 | Find specialists near a family member | Jam + TD | Stretch | ✅ Live: `/specialists?memberId=<id>` |
| 6 | Track family health remotely (Rosa in Savannah), cohort view | TD + Jam | Stretch | ✅ Live: Rosa's dashboard card, `/data` cohort chart |
| 7 | "Powered by Tiger Data" page (prize) | TD | Stretch | ✅ Live: `/data` |
| 8 | Live Apple HealthKit (native iOS app) | TD | Stretch | Pitch as the next step |

How we build, review and ship: **[docs/WORKFLOW.md](docs/WORKFLOW.md)**.

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
- **After every `git pull`, run `npm install`** (teammates add libraries; the build fails with `Module not found` otherwise).
- **Run:** `npm run dev`. In Coder it starts on **port 3001** (3000 is taken); open it from code-server's **Ports** tab. Check keys at `/api/health`.
- **Before opening a PR:** `npm run lint` and `npm run build` must pass, and test the routes/pages you touched.
- **Data scripts:** `npm run seed:tiger` (Cam; database already loaded), `npm run seed:typesense` (loads medicines into Typesense).
- **Keys:** `.env.local` (copy of `.env.example`). **Cam holds and distributes all keys** by private DM; teammates get a **read-only** Tiger Data login. Never print, commit or paste key values; to check them, report only "set"/"empty". Production and preview keys live in Vercel and Cam adds them. See `docs/API-KEYS.md`.
- **TLS:** never "fix" a database certificate error by disabling verification; use `tigerConnectionConfig()` from `src/lib/tiger-ca.ts`.

## Git workflow
- **Never push straight to `main`** (it's protected).
- Start each session by pulling `main`, then work on a branch named `<name>/<feature>`, e.g. `td/dashboard`, `ish/checkup`.
- Commit small and often with clear messages. Pull `main` into your branch often.
- Open a **pull request into `main`** and send Cam the PR link + Vercel preview link. Cam reviews and merges (only on an explicit "merge PR <number>"). Keep PRs inside your own files (ownership map in `docs/WORKFLOW.md`), credit new libraries in the README, and list new env var names.
- **Push early**: unpushed work only exists in your workspace.

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
