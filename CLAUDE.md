# IDoc — Emory Hacks 2026

IDoc is a telehealth platform. Patients get AI-led wellness checkups over Chert's iPhone FaceTime feature, search for medicines and conditions by voice or image, connect with nearby specialists and their own providers, track family health, and receive monthly and yearly health summaries.

Built at **Emory Hacks 2026** (Healthcare track), Fri Nov 13 to Sun Nov 15, 2026.

## Event rules (do not break these)
- All project code must be written **after 8PM Fri Nov 13**. Do not reuse code from older projects.
- Frameworks, libraries and APIs are allowed, but **every one must be credited in the README** under "What we built vs. what we used". Add an entry whenever you add a dependency.
- Submit by **7:30AM Sun Nov 15**. The hard deadline is 8AM, judging expo is at 8:15AM, and finalist demos are at 10:15AM.
- Teams have at most 4 people.
- Each sponsor prize (Gemini, etc.) has its own submission rules. Check them before opting in.

## Team
| Person | Role | Owns |
|---|---|---|
| **Cam** | Lead / Product & Pitch | Scope and priorities, PR reviews, README, Devpost, demo script, pitch, backup demo video |
| **Ish** | AI & Video Engineer | Chert FaceTime checkups, Gemini prompts, checkup and summary logic, safety wording |
| **Jam** | Search & Backend Engineer | Typesense search, Supabase database, API routes, sample data, Coder setup |
| **TD** | Frontend & Apple Health Engineer | App screens, dashboard and charts, Apple Health data, design, mobile layout, testing |

When asked to do work, keep inside the requester's area. If a change touches someone else's area, say so, so they can be looped in.

## Features
Listed in priority order. **Core** features make the demo; the rest are **stretch** goals. Cam has the final say on scope.

| # | Feature | Owner | Priority |
|---|---|---|---|
| 1 | AI-led preliminary wellness checkup over Chert FaceTime (Gemini) | Ish | Core |
| 2 | Typesense voice and image search: identify medicines, look up symptoms and examinations | Jam | Core |
| 3 | Monthly and yearly health summaries showing trends (Gemini) | Ish + TD | Core |
| 4 | Health dashboard with Apple Health-style data (sample data for the demo) | TD | Core |
| 5 | Find specialists in your area | Jam + TD | Stretch |
| 6 | Connect with healthcare providers for long-distance tracking | Jam | Stretch |
| 7 | Family health tracking (history and present) | Jam + TD | Stretch |
| 8 | Live Apple HealthKit integration (needs a native iOS app) | TD | Stretch, pitch as the next step |

**Cut line:** if time runs short, drop from the bottom of this list up.

## Tech stack
Teammates can add tools they need. Add each one here and to the README credits.

- **App:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes
- **AI:** Google Gemini API (`@google/genai`)
- **Search:** Typesense Cloud (`typesense`)
- **Database + auth:** Supabase (Postgres)
- **Video checkups:** Chert. Follow Chert's official docs and SDK; do not guess its API.
- **Health data:** realistic sample data shaped like Apple Health output
- **Dev environment:** Coder
- **Hosting:** Vercel, deployed from this repo

## Dev environment (Coder)
- Deployment: https://coder.c1.workshop.cdr.dev/
- Team workspace: `gldnch/IDoc`. It uses the `coder-dev-environment` template and stops after 1 day, so restart it if it's down.
- Setup for each teammate:
  1. Sign in at the deployment URL in a browser.
  2. Install the CLI: `winget install --id Coder.Coder --exact --source winget` (Windows) or see Coder's docs.
  3. Run `coder login https://coder.c1.workshop.cdr.dev/` and paste the session token it gives you.
  4. Check with `coder list`.

## Git workflow
- **Never push straight to `main`.**
- Branch from an up-to-date `main` and name it `<name>/<feature>`, e.g. `ish/checkup-video`, `jam/typesense-search`.
- Commit small and often, with clear messages ("Add medicine search endpoint", not "stuff").
- Open a **pull request into `main`**. Cam reviews and approves. If Cam is unavailable, any other teammate can approve.
- Pull `main` into your branch often to avoid big merge conflicts.
- Repo: https://github.com/GldnCh/EmoryHacks2026 (**public**)

## Safety and privacy rules
- **Never commit secrets.** API keys go in `.env.local`, which must be listed in `.gitignore`. Keep a `.env.example` with variable names only. The repo is public.
- **No real patient or personal health data.** Use only fabricated sample data.
- All AI health output must say it is **not medical advice** and recommend seeing a clinician for anything serious.
- AI must never invent diagnoses, doses or drugs. When unsure, it says so and points the user to a professional.

## Schedule
| When | Goal |
|---|---|
| Fri 8PM–12AM | Repo and stack scaffolded, API keys working, each core feature has a "hello world" |
| Sat morning | Core features working end to end |
| **Sat 6PM** | **Feature freeze.** Polish, fix bugs, write the README and Devpost |
| Sat evening | Deploy to Vercel, record a backup demo video, rehearse the pitch |
| **Sun 7:30AM** | **Submit** |
