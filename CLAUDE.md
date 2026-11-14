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

## Onboarding: getting every teammate connected
Do these steps in order. Each step ends with a check so you know it worked. If a step fails, ask Claude, paste the error, and say which step you're on.

**Where to run each step:**

| Steps | Where | Shell |
|---|---|---|
| **1–6** (GitHub, Git, GitHub CLI, Coder sign-in, create workspace) | **Your own computer** | **PowerShell** on Windows (`winget` commands) · **Terminal** on Mac (`brew` commands, needs [Homebrew](https://brew.sh)) |
| **7–11** (open workspace, clone, install, branches/PRs, Claude Code) | **Inside your Coder workspace** (its browser VS Code terminal, or after `coder ssh`) | **Linux bash**, not PowerShell |

- The Coder workspace is a separate computer. Signing in to GitHub on your laptop does **not** carry over, so Step 8 signs in again inside the workspace.
- Commands like `cp`, `curl` and `&&` in Steps 8–11 and the daily routine are bash commands. Some fail in Windows PowerShell, so run them in the workspace terminal.

### Cam does first (one time, for the whole team)
1. Collect everyone's GitHub username.
2. Add each teammate as a collaborator: GitHub → `GldnCh/EmoryHacks2026` → **Settings → Collaborators → Add people**. Or ask Claude to send the invites with `gh`.
3. *(Recommended)* Protect `main`: **Settings → Branches → Add rule** for `main` → tick **Require a pull request before merging** (1 approval).
4. Share API keys **privately** (DM or team chat, never in the repo) as each owner creates them (see "Accounts and API keys" below).

### Every teammate (Cam, Ish, Jam, TD)
**Step 1. GitHub account and repo access**
- Create a GitHub account at https://github.com if you don't have one, and send your username to Cam.
- Accept the collaborator invite: check your email, or go to https://github.com/GldnCh/EmoryHacks2026/invitations.
- ✅ Check: you can open the repo page and see a **Settings** tab or a green **Code** button you can push to.

**Step 2. Install Git**
- Windows: `winget install --id Git.Git -e` · Mac: `brew install git`
- Close and reopen your terminal.
- ✅ Check: `git --version` prints a version.

**Step 3. Set your Git name and email** (use the email on your GitHub account)
```
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
- ✅ Check: `git config --global user.email` prints your email.

**Step 4. Install the GitHub CLI and sign in**
- Windows: `winget install --id GitHub.cli -e` · Mac: `brew install gh`
- Open a **new** terminal window, then run `gh auth login` and choose **GitHub.com → HTTPS → Yes → Login with a web browser**. Paste the code in your browser and click **Authorize**.
- Run `gh auth setup-git` so Git uses this sign-in when you push.
- ✅ Check: `gh auth status` says "Logged in to github.com".

**Step 5. Sign in to Coder**
- Open https://coder.c1.workshop.cdr.dev/ in your browser and sign in (use the option the page offers, e.g. GitHub).
- Install the Coder CLI — Windows: `winget install --id Coder.Coder --exact --source winget` · Mac: `brew install coder`
- Open a **new** terminal window, run `coder login https://coder.c1.workshop.cdr.dev/`, and paste the session token from your browser. **Never share or commit this token.**
- ✅ Check: `coder list` runs without an error.

**Step 6. Create your own Coder workspace**
Each person gets their own workspace (Cam's is `gldnch/IDoc`; don't share one).
- In the Coder website: **Workspaces → New workspace →** pick the `coder-dev-environment` template → name it `idoc-<yourname>` → **Create**.
- Workspaces stop automatically after about 1 day. If yours is stopped, click **Start** (or run `coder start <workspace-name>`).
- ✅ Check: `coder list` shows your workspace as **Started**.

**Step 7. Open your workspace**
Pick one:
- **In the browser:** click your workspace, then **VS Code** (or **Terminal**).
- **In VS Code on your computer:** install the **Coder** extension, then click **Open in VS Code** on your workspace page.
- **From a terminal:** `coder ssh <workspace-name>`

**Step 8. Get the code (inside your Coder workspace)**
In the workspace terminal:
```
gh auth login            # same choices as Step 4 (the workspace is a separate computer)
gh auth setup-git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git clone https://github.com/GldnCh/EmoryHacks2026.git
cd EmoryHacks2026
```
- ✅ Check: `git remote -v` shows `GldnCh/EmoryHacks2026`.

**Step 9. Install the project and add your keys** *(once the app has been scaffolded)*
```
node --version           # needs 18 or higher
npm install
cp .env.example .env.local
```
- Open `.env.local` and paste in the API keys Cam or the key owner sent you.
- Run `npm run dev` and open the URL it prints (in Coder, use the forwarded port link on the workspace page).
- ✅ Check: the app loads in your browser.

**Step 10. Make your first branch and pull request**
```
git checkout main
git pull
git checkout -b <yourname>/<feature>      # e.g. jam/typesense-search
# ...make changes...
git add .
git commit -m "Short description of the change"
git push -u origin <yourname>/<feature>
gh pr create --fill
```
- Ask Cam (or any teammate) to review and approve, then merge on GitHub.
- ✅ Check: your PR shows on https://github.com/GldnCh/EmoryHacks2026/pulls.

**Step 11. (Optional) Claude Code**
Claude Code is **not required**. Everything above (editing, running the app, Git, PRs) works in your Coder workspace's VS Code and terminal without it.

If installing it on your own computer fails, install it **inside your Coder workspace** instead. The workspace is Linux, which avoids most Windows/Mac install problems:
```
curl -fsSL https://claude.ai/install.sh | bash
# or, if that fails:
npm install -g @anthropic-ai/claude-code
```
Then run `claude` inside the `EmoryHacks2026` folder and sign in when asked. It reads this file automatically.

### Accounts and API keys (owner creates, then shares privately)
Step-by-step instructions for each key: **[docs/API-KEYS.md](docs/API-KEYS.md)**. After filling in `.env.local`, open `/api/health` in the running app to check which keys work.

| Service | Owner | Where | Variable in `.env.local` |
|---|---|---|---|
| Gemini API | Ish | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Chert | Ish | Chert sponsor docs / dashboard | *(per Chert's docs)* |
| Typesense Cloud | Jam | https://cloud.typesense.org | `TYPESENSE_HOST`, `TYPESENSE_API_KEY` (admin key server-side only; give the frontend a search-only key) |
| Supabase | Jam | https://supabase.com/dashboard | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Vercel | Cam | https://vercel.com (import the GitHub repo) | Add all the above in **Project → Settings → Environment Variables** |
| Devpost | Cam | Emory Hacks Devpost page | Add teammates to the submission |

Whenever someone adds a new key, they must also add the variable **name** (no value) to `.env.example` and tell the team.

### Daily routine
1. Start your Coder workspace if it's stopped.
2. `git checkout main && git pull`, then switch to your branch and run `git merge main`.
3. Work, commit often, push, and open or update your PR.

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
