# How the iCare team works

Our process, from writing code to the live site. If something here conflicts with CLAUDE.md, CLAUDE.md wins.

## The short version
1. Everyone codes with **Claude Code inside their own Coder workspace** ([QUICKSTART.md](../QUICKSTART.md)).
2. Every change goes on a **branch**, then a **pull request (PR)**. `main` is protected; nobody pushes to it directly.
3. **Cam reviews every PR** (with Claude's review prompt) and **merges** it.
4. Every merge to `main` **deploys automatically** to https://icare-wall-e9.vercel.app. Every PR gets its own **preview link**.
5. **Last merge: Sun 6:30 AM.** Submission: 7:30 AM.

## Roles in the process
| Who | Does |
|---|---|
| **Cam** (Lead) | Reviews and merges PRs, distributes keys, manages Vercel, the Tiger Data account and the Devpost submission, records the demo video |
| **Ish** | AI and video: Gemini check-ins and summaries, Chert, `/checkin` |
| **Jam** | Search and backend: Typesense, API routes, data libraries, `/medicines`, `/specialists` |
| **TD** | Screens and design: app shell, dashboard, family pages, Tiger Data page, shared components |

### Who owns which files
- **TD:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/`, `src/app/dashboard/`, `src/app/family/`, `src/app/data/`, `src/app/globals.css`
- **Ish:** `src/lib/ai/`, `src/app/api/ai/`, `src/app/checkin/`, `docs/CHERT.md`
- **Jam:** `src/lib/` (except `ai/`), `src/app/api/` (except `ai/`), `src/app/medicines/`, `src/app/specialists/`
- **Cam:** `CLAUDE.md`, `QUICKSTART.md`, `docs/` (except `CHERT.md`), `scripts/`, `db/`
- **Shared (small edits, mention them in your PR):** `README.md`, `docs/DEVPOST.md`, `docs/MEDICAL-DATA.md`, `.env.example`, `package.json`

Need a change in someone else's files? Ask them, or make it tiny and call it out in your PR.

## Daily loop (each teammate)
1. Start your Coder workspace if it's stopped, open a terminal, `cd ~/EmoryHacks2026 && claude`.
2. Tell Claude: **"Pull the latest main, run npm install, then switch to (or create) my branch `<name>/<feature>`."**
   - `npm install` after every pull matters: if a teammate added a library (e.g. `recharts`), the build fails without it.
3. Describe your task. Your prompts are in [docs/TEAM-PROMPTS.md](TEAM-PROMPTS.md).
4. Claude builds, runs `npm run lint` + `npm run build`, tests on port 3001, commits, pushes and opens the PR.
5. **Send Cam the PR link and the Vercel preview link.**
6. After it merges, start the next task from a **fresh branch off `main`**.

**Push early.** Unpushed work only exists in your workspace. A draft PR is better than nothing: it backs up your work and lets Cam review sooner.

## Pull requests
**Branch names:** `<name>/<feature>`, e.g. `jam/search-polish`, `ish/gemini`.

**Every PR must:**
- pass `npm run lint` and `npm run build`
- stay in the author's files (see ownership above)
- contain **no secrets**: no keys, no `.env.local`, no connection strings
- use **only fictional patient data** (the Rivera family)
- keep **"Not medical advice"** on every page that shows health info
- credit **every new library or service** in the README ("What we built vs. what we used")
- list any **new environment variable names** (names only) in `.env.example` and in the PR description
- describe how to test it, and not claim anything in docs or Devpost that doesn't work yet

**Review:** Cam pastes the review prompt from [docs/TEAM-PROMPTS.md](TEAM-PROMPTS.md#cam-reviewing-a-pull-request) (or says "review PR <number>"). Claude checks the rules above, builds it, tests every page and route it adds, opens the Vercel preview, and recommends merge or not. Problems are listed most-important first; small polish goes into a follow-up PR instead of blocking.

**Merge:** only Cam merges, by saying **"merge PR <number>"** (Claude Code won't merge without that exact instruction). Squash-merge, delete the branch.

## Deploys and previews
- **Production:** every merge to `main` → https://icare-wall-e9.vercel.app (about 1 minute).
- **Previews:** every push to a PR branch → its own `*.vercel.app` link, posted on the PR by Vercel. Previews have the same keys as production.
- **Region:** Vercel functions and the Tiger Data database are both in AWS us-east-1, so database queries take a few milliseconds.
- **Broken production?** Vercel → project `idoc` → Deployments → the last good one → **Promote to Production** (instant rollback). Then fix forward with a PR.

## Keys and secrets
- **Cam holds and distributes the keys.** Teammates get only what they need, by **private DM**:
  - everyone: the **read-only** Tiger Data login (`idoc_team`), which can read all health data but can't change or delete anything
  - Ish: `GEMINI_API_KEY` · Jam: the three `TYPESENSE_*` values
- Keys go **only** in `.env.local` (git-ignored) and in Vercel. Never in code, PRs, issues, chat channels or prompts to Claude.
- Ask Claude to check your keys with "report set/empty for each variable in .env.local"; it never needs to print a value.
- **New key needed?** Add the variable **name** to `.env.example`, list it in your PR, and send the value to Cam privately. Cam adds it in Vercel (Settings → Environment Variables, **Sensitive**, Production + Preview) and redeploys.
- Details: [docs/API-KEYS.md](API-KEYS.md).

## Data rules
- Patients are **only** the fictional Rivera family (`src/lib/sample-data/health.ts`). Never real patient data.
- Public reference data (FDA, NLM, CMS) is fine; show the disclaimers the routes return.
- AI never diagnoses, never invents doses or drugs, and sends emergencies to 911.
- The database is loaded and owned by Cam. Teammates read it; schema or data changes go through Cam (`npm run seed:tiger`).
- Database TLS: never "fix" a certificate error by disabling verification (see `src/lib/tiger-ca.ts`).

## Timeline to submission
| When | What |
|---|---|
| Now → Sun 6:30 AM | Build, PR, review, merge. No feature freeze |
| **Sun 6:30 AM** | **Last merge.** After this, only fixes for anything broken on the live site |
| Sun 6:30–7:30 AM | Cam checks every page live (checklist in [docs/DEMO.md](DEMO.md)), updates Devpost, records/updates the video |
| **Sun 7:30 AM** | **Submit on Devpost** (hard deadline 8 AM) |
| 8:15 AM / 10:15 AM | Judging expo / finalist demos |

Devpost: Cam owns the submission (story, links, video, prize opt-ins). The working draft and its current status are in [docs/DEVPOST.md](DEVPOST.md).

## Troubleshooting
| Problem | Fix |
|---|---|
| Build says `Module not found` | Someone added a library: run `npm install` |
| GitHub isn't updating | Ask Claude to diagnose: wrong folder (`~/coder` instead of `~/EmoryHacks2026`), wrong GitHub account in `gh auth status`, commits not pushed, or pushing to `main` (rejected) |
| PR has merge conflicts | "Merge origin/main into my branch and show me the conflicts before resolving them" |
| `/api/health` shows `false` | Key missing or misspelled in `.env.local`; restart `npm run dev` after editing |
| Workspace stopped | Coder → your workspace → Start; your files are kept |
| Port 3000 busy | Normal in Coder; the app runs on 3001 |
