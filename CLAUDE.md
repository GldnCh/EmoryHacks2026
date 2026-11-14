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
Before you start, make sure your workspace exists and is running:
1. Go to https://coder.c1.workshop.cdr.dev/ and sign in, then click **Workspaces** at the top.
2. Your workspace (e.g. `idoc-ish`) should show a green **Running/Started** status.
   - **No workspace?** Go back to Step 6. The first start can take a few minutes.
   - **Stopped?** Click it, click **Start**, and wait for Running.

Open it in the browser (easiest):
1. Click your workspace's name to open its page.
2. You'll see app buttons: **code-server**, **Claude Code**, **Terminal**, and a few others you can ignore (Dev Web UI, Dev coderd API).
3. Click **code-server**. VS Code opens in a new browser tab.
   - Nothing happens? Your browser blocked the pop-up. Allow pop-ups for the site and click again.
   - Unhealthy or stuck loading? It's still starting. Wait a minute and refresh.
4. Open a terminal: **☰ → Terminal → New Terminal** (or **Ctrl + `**).
5. This is a **Linux bash** terminal inside the workspace. Everything from Step 8 on goes here, **not in PowerShell**.

> code-server opens a folder called `coder` by default. That's Coder's own sample project, so **don't work in it**. Step 8 clones our repo next to it.

Other ways to open it: install the **Coder** extension in VS Code on your computer and click **Open in VS Code** on the workspace page, or run `coder ssh <workspace-name>` from PowerShell.

- ✅ Check: you have a terminal in code-server and its prompt shows `coder@...`.

**Step 8. Get the code (inside your Coder workspace)**
Git, the GitHub CLI and Node 22 are **already installed** in the workspace, so you don't install anything. In the workspace terminal:
```
cd ~
gh auth login
```
Choose **GitHub.com → HTTPS → Yes → Login with a web browser**. It prints a code and a link. Open the link in your own browser, paste the code and click **Authorize**. (The workspace is a separate computer, so signing in on your laptop in Step 4 does not carry over.) Then:
```
gh auth setup-git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git clone https://github.com/GldnCh/EmoryHacks2026.git
cd EmoryHacks2026
```
Then open the project in VS Code: **☰ → File → Open Folder →** `/home/coder/EmoryHacks2026` → **OK**.
- ✅ Check: `git remote -v` shows `GldnCh/EmoryHacks2026`.

**Step 9. Install the project, add your keys and run the app**
All of this is in the **workspace terminal**.

*9a. Get the latest code*
```
cd ~/EmoryHacks2026
git checkout main
git pull
```
- ✅ Check: the prompt ends with `EmoryHacks2026`, and `git pull` says "Already up to date" or lists updated files.

*9b. Check Node.js*
```
node --version
```
- ✅ Check: it prints `v22.x`. That's already installed; the project needs 18+.

*9c. Install the project's packages*
```
npm install
```
This downloads Next.js, React, Gemini, Typesense, Supabase and so on into `node_modules`. It takes 1–2 minutes. Yellow `warn` lines and a "vulnerabilities" note are normal. If it ends with red `ERR!` lines, copy the error and ask Claude.
- ✅ Check: it finishes with something like "added 400 packages".

*9d. Create your private keys file*
```
cp .env.example .env.local
```
This copies the template (variable names only) into `.env.local`, where your real keys go. `.env.local` is **ignored by Git**, so it never gets pushed; in the VS Code file list it shows in gray, which is how you know it's ignored. **Only do this once.** Running it again wipes out keys you've already pasted.

*9e. Paste in the keys*
1. In code-server's file list, click **`.env.local`**.
2. Paste each key right after its `=` sign, **with no spaces and no quotes**, e.g. `GEMINI_API_KEY=AIzaSyB...`
3. Save with **Ctrl + S**.

No keys yet? Leave the lines blank. The app still runs; it just can't use Gemini, Typesense or Supabase until the keys are added. Ish (Gemini, Chert) and Jam (Typesense, Supabase) create the keys using [docs/API-KEYS.md](docs/API-KEYS.md) and share them **privately** in team chat. **Never** post them on GitHub.

*9f. Start the app*
```
npm run dev
```
You'll see:
```
⚠ Port 3000 is in use, trying 3001 instead.
- Local:   http://localhost:3001
✓ Ready
```
Port 3000 is taken by Coder's sample project, so the app uses **3001**. That's expected.
- Leave this terminal running; closing it stops the app. Press **Ctrl + C** in it to stop the app yourself.
- To run other commands meanwhile, open a second terminal with the **+** in the terminal panel.

*9g. Open the app in your browser*
`localhost` means the **workspace**, not your laptop, so typing `localhost:3001` in your own browser won't work. Instead:
1. In code-server, click the **Ports** tab next to **Terminal**.
2. Find port **3001** and click the **globe icon** (Open in Browser). If 3001 isn't listed, click **Add Port**, type `3001`, press Enter.
- ✅ Check: a page shows **IDoc** with "AI-led wellness checkups…".

*9h. Check your keys*
Click **Check API key setup** on that page (or add `/api/health` to the address). You'll see something like:
```json
{ "ok": true, "configured": { "gemini": true, "typesense": false, "supabase": false } }
```
- `true` means the key is filled in; `false` means it's blank or misspelled in `.env.local`.
- This only checks that a key is **filled in**, not that it's **valid**. A wrong key shows up as an error when the feature runs.
- **After changing `.env.local`, restart the app** (Ctrl + C, then `npm run dev`). Next.js only reads keys at startup.

*Common problems*
| Problem | Fix |
|---|---|
| `npm: command not found` | You're in PowerShell. Use the terminal inside code-server. |
| `No such file or directory: EmoryHacks2026` | Step 8 (clone) didn't finish. Run `cd ~` and the `git clone` command again. |
| `.env.local` doesn't show in the file list | Run `ls -a` to confirm it exists, or open it with `code .env.local`. |
| Page won't load from the globe icon | Make sure `npm run dev` is still running and says **Ready**, then try again. |
| Health still shows `false` after adding a key | Save the file (Ctrl + S), then restart `npm run dev`. |

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
Claude Code is **not required**. Everything above (editing, running the app, Git, PRs) works in code-server without it.

It's **already installed and set up in your Coder workspace**, so you don't need to install it on your own computer:
- Click the **Claude Code** button on your workspace page, **or**
- In the workspace terminal, run `cd ~/EmoryHacks2026` then `claude`.

Start it inside the `EmoryHacks2026` folder so it reads this file automatically. If it asks you to sign in, follow the prompt.

### Keeping your workspace running (do this once)
By default a workspace stops automatically **1 day** after it starts. Extend yours so it stays up through submission (Sun 7:30AM) and finalist demos (Sun 10:15AM).

In **PowerShell on your own computer** (not inside the workspace), using your own workspace name:
```
coder schedule extend idoc-<yourname> 30h
coder schedule stop idoc-<yourname> 48h
coder schedule show idoc-<yourname>
```
- `extend` pushes back the **current** stop time (30 hours from now).
- `stop` sets the default for **future** starts to 2 days.
- ✅ Check: `schedule show` prints a **STOPS NEXT** time on Sunday Nov 15, e.g.
  ```
  WORKSPACE         STARTS AT  STARTS NEXT  STOPS AFTER  STOPS NEXT
  you/idoc-ish                              2d           2026-11-15T13:08:19-05:00
  ```
- Website alternative: open your workspace page and click **+** next to the stop time at the top, or open **Settings → Schedule**.
- Forgot your workspace name? Run `coder list`.

**Stopping does not delete anything.** Your files, the cloned repo, `node_modules` and `.env.local` are all kept. Only the running app stops. Still, **push your branch to GitHub often**; that's the real backup.

### If your workspace stopped: reopen it and restart the app
**1. Start the workspace** (pick one)
- **Website:** go to https://coder.c1.workshop.cdr.dev/ → **Workspaces** → click your workspace → click **Start**. Wait for the status to turn green **Running** (usually under a minute; can take a few minutes).
- **PowerShell on your computer:**
  ```
  coder start idoc-<yourname>
  ```
  ✅ It ends with a message that the workspace is running. Confirm with `coder list` (STATUS = **Started**).

**2. Open code-server**
- On the workspace page, click **code-server**. If it says unhealthy or keeps loading, wait a minute and refresh.
- If the sidebar shows the `coder` folder instead of our project: **☰ → File → Open Folder →** `/home/coder/EmoryHacks2026` → **OK**.

**3. Open a terminal and go to the project**
**☰ → Terminal → New Terminal**, then:
```
cd ~/EmoryHacks2026
git status
```
✅ The first line says `On branch <your branch>` (or `main`). If you see `No such file or directory`, the project folder is missing; go back to Step 8.

**4. Get your teammates' latest work**
```
git checkout main
git pull
git checkout <yourname>/<feature>
git merge main
```
✅ `git pull` says "Already up to date" or lists files. `git merge main` says "Already up to date" or "Merge made by...". If it says **CONFLICT**, stop and ask Claude or a teammate for help before continuing.

**5. Reinstall packages only if they changed**
If `git pull` listed `package.json` or `package-lock.json`, or `npm run dev` complains about a missing module, run:
```
npm install
```
✅ Ends with "added/changed N packages". Otherwise skip this step.

**6. Restart the app**
```
npm run dev
```
✅ Within about 10 seconds you see:
```
 ⚠ Port 3000 is in use, using available port 3001 instead.
   - Local:        http://localhost:3001
   - Environments: .env.local
 ✓ Ready in 2.3s
```
Leave this terminal running. Open a second terminal with **+** for other commands.

**7. Open the app again**
Click the **Ports** tab next to Terminal → port **3001** → **globe icon**. If 3001 isn't listed, click **Add Port** and type `3001`.
✅ The IDoc page loads. `/api/health` shows the same `true` values as before (your `.env.local` was kept).

**When to restart `npm run dev` without the workspace stopping**
- You changed `.env.local` (keys are only read at startup).
- You ran `npm install` or pulled new packages.
- The terminal shows a crash or the page stops updating.

To restart: click in the terminal running the app, press **Ctrl + C** (it returns to the `$` prompt), then run `npm run dev` again.

**Troubleshooting**
| Problem | Fix |
|---|---|
| `Start` fails or the workspace shows **Failed** | Click **Start** again. If it still fails, ask the Coder sponsor table. Your files are safe. |
| `coder: not logged in` | Run `coder login https://coder.c1.workshop.cdr.dev/` (Step 5). |
| `Port 3001 is in use` / app opens on 3002 | An old `npm run dev` is still running in another terminal. Close it with Ctrl + C, or just use the port it printed. |
| `Module not found` | Run `npm install`, then `npm run dev`. |
| Page loads but keys show `false` | Check `.env.local` is still filled in and saved, then restart the app. |

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
