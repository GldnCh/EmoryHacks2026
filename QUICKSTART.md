# IDoc Quickstart

**All you need is a web browser.** Everything else (Git, GitHub CLI, Node, and **Claude Code, already signed in**) is pre-installed in your Coder workspace. Don't install anything on your laptop.

Takes about 10 minutes.

## 1. Accept the GitHub invite
Check your email, or open https://github.com/GldnCh/EmoryHacks2026/invitations and click **Accept**.

## 2. Sign in to Coder
Open **https://coder.c1.workshop.cdr.dev/** and sign in.

## 3. Create your workspace
**Workspaces → New workspace →** template **`coder-dev-environment`** → name it `idoc-<yourname>` → **Create**.
Wait until it says **Running** (first start can take a few minutes).

## 4. Keep it running through Sunday
Workspaces stop after 1 day by default. On your workspace page, click the **+** next to the stop time (or **Settings → Schedule**) and push it to **Sunday afternoon**. Stopping never deletes your files, but it interrupts your work.

## 5. Open a terminal
On your workspace page, click **Terminal**, or click **code-server** (VS Code in the browser) and then **☰ → Terminal → New Terminal**.

## 6. Run the setup script
Paste this one line and press Enter:
```
curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash
```
It signs you in to GitHub (if needed), sets your Git name/email, clones the repo to `~/EmoryHacks2026`, installs packages and creates your `.env.local`. If GitHub sign-in starts, copy the code it shows, open the link in your browser, paste the code and click **Authorize**.

✅ It ends with **"Setup complete"**.

## 7. Add the API keys
**TD has the team's API keys** (Cam has the Tiger Data one). Ask them **privately** (DM), then:
```
code ~/EmoryHacks2026/.env.local
```
Paste each value after its `=` (no spaces, no quotes) and save with **Ctrl + S**. Never post keys in GitHub or a group channel; the repo is public.

## 8. Start Claude Code
```
cd ~/EmoryHacks2026 && claude
```
It's already signed in through the workshop and reads `CLAUDE.md` automatically, so it knows the team, rules, data and Git workflow.

**Start every session with:**
> Pull the latest main, then create (or switch to) my branch `<yourname>/<feature>`.

**Then paste your task prompt** from **[docs/TEAM-PROMPTS.md](docs/TEAM-PROMPTS.md)** (one per teammate: it verifies your setup, then walks Claude through your feature step by step). Short versions:
- **TD:** *Build a family dashboard page with charts from `/api/trends/<id>` and `/api/vitals/<id>`. Test it, commit, push and open a PR.*
- **Ish:** *Add a Gemini wellness check-in API route that uses `/api/family/<id>/profile` and `/api/trends/<id>` as context. Test it and open a PR.*
- **Jam:** *Build a medicine search page using `/api/medicines/search`. Test it and open a PR.*

Claude writes the code, runs it, commits, pushes and opens the pull request. **Cam reviews and merges.** `main` is protected, so nothing goes live without review. Every merge updates https://idoc-wall-e9.vercel.app.

## Run the app yourself (optional)
```
cd ~/EmoryHacks2026 && npm run dev
```
It starts on **port 3001** (3000 is used by Coder's sample project). In code-server open the **Ports** tab → **3001** → globe icon. `/api/health` shows which keys are working.

## If your workspace stopped
Open your workspace page → **Start** → wait for **Running** → open a terminal → `cd ~/EmoryHacks2026 && git pull` → `claude` (or `npm run dev`). Your files and `.env.local` are still there.

## Troubleshooting
| Problem | Fix |
|---|---|
| `curl: command not found` or `npm: command not found` | You're on your laptop. Use the terminal **inside** the Coder workspace (step 5). |
| GitHub says "Repository not found" | Accept the invite (step 1), then run the setup line again. |
| `.env.local` isn't in the file list | It's hidden from Git on purpose. Open it with `code ~/EmoryHacks2026/.env.local`. |
| `/api/health` shows `false` for a key | Check the line in `.env.local`, save, then restart `npm run dev` (Ctrl + C, run again). |
| Anything else | Ask Claude: paste the error and say which step you're on. |
