# Team prompts for Claude Code

Everyone codes with **Claude Code inside their Coder workspace**. Copy your prompt below and paste it into Claude.

## Before you paste (browser only, ~5 minutes)
1. Accept the GitHub invite.
2. Sign in at **https://coder.c1.workshop.cdr.dev/** → **Workspaces → New workspace → `coder-dev-environment`**, name it `icare-<name>`, and extend the stop time to Sunday.
3. On the workspace page click **Terminal** and run:
   `curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash`
4. Get your keys from Cam privately and paste them with `code ~/EmoryHacks2026/.env.local`.
5. Run `cd ~/EmoryHacks2026 && claude`, then paste **your** prompt.

Full details: [QUICKSTART.md](../QUICKSTART.md). How we review and merge: [WORKFLOW.md](WORKFLOW.md).

| Teammate | Prompt | Branch |
|---|---|---|
| TD | [Dashboard and app shell](#td-dashboard-and-app-shell) | `td/dashboard` |
| Ish | [Gemini check-in, summaries, Chert](#ish-gemini-check-in-summaries-chert) | `ish/gemini` |
| Jam | [Typesense search, medicine and specialist pages](#jam-typesense-search-medicine-and-specialist-pages) | `jam/search` |
| Cam | [Reviewing a pull request](#cam-reviewing-a-pull-request) | — |

**Round 2 tasks:** [jump to the round 2 prompts](#round-2-prompts-after-the-first-prs-merged).

**Who owns which files** (so PRs don't collide):
- **TD:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/`, `src/app/dashboard/`, `src/app/family/`, `src/app/data/`
- **Ish:** `src/lib/ai/`, `src/app/api/ai/`, `src/app/checkin/`, `docs/CHERT.md`
- **Jam:** `src/lib/` (except `ai/`), `src/app/api/` (except `ai/`), `src/app/medicines/`, `src/app/specialists/`
- **Shared (small edits only):** `README.md`, `docs/DEVPOST.md`, `docs/MEDICAL-DATA.md`, `.env.example`

---

## TD: dashboard and app shell
```
You are helping me (TD, Frontend & Apple Health Engineer) on iCare, our Emory Hacks 2026 project. Read CLAUDE.md, QUICKSTART.md, docs/SAMPLE-DATA.md and docs/MEDICAL-DATA.md first, and follow every rule in CLAUDE.md (Git workflow, safety rules, credits). Work step by step, tell me what you are doing at each step, and stop and ask me if anything fails twice.

PART A: VERIFY MY ENVIRONMENT (do not skip)
1. Confirm we are in the Coder workspace in ~/EmoryHacks2026 (run pwd, node --version should be v22+, gh auth status should be logged in). If the repo is missing, run: curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash
2. Run: git checkout main && git pull && npm install
3. Check .env.local exists and which variables are filled in. NEVER print key values; only report "set" or "empty" for GEMINI_API_KEY, TYPESENSE_HOST, TYPESENSE_API_KEY, NEXT_PUBLIC_TYPESENSE_SEARCH_KEY, TIGER_DATABASE_URL. If any are empty, tell me which to ask Cam for and wait.
4. Start the dev server in the background (npm run dev; it uses port 3001 because 3000 is taken) and curl http://localhost:3001/api/health. Expect "tigerData": true at minimum. Also curl /api/trends/jordan and /api/vitals/sam?date=2026-10-03 and show me the "source" and "queryMs" fields.
5. Create my branch: git checkout -b td/dashboard

PART B: BUILD THE APP SHELL AND HEALTH DASHBOARD (my area: all screens, layout, design)
Use Next.js App Router + TypeScript + Tailwind (already installed). Pages are client components that fetch our existing API routes; do NOT change files in src/lib/ or src/app/api/ (those belong to Jam and Ish). Install recharts for charts (npm install recharts) and add it to the README "Frameworks, libraries and services used" list.

1. App shell: edit src/app/layout.tsx to add a header with the iCare name and nav links: Dashboard (/dashboard), Check-in (/checkin), Medicines (/medicines), Specialists (/specialists), Tiger Data (/data). Some of those pages will be built by Ish and Jam; links can 404 until their PRs merge. Add a footer on every page: "Not medical advice. Demo uses a fictional family with fabricated data." Make it look clean and calm (healthcare feel), and make it work on a phone-width screen.
2. Shared components in src/components/ : Card, StatTile (big number + label + change vs last month, green when improving, amber when worsening), TrendChart (recharts line chart wrapper), Disclaimer.
3. src/app/page.tsx: replace the placeholder with a landing page: one-line pitch, 3 feature tiles linking to Dashboard, Medicines, Specialists, and a "Meet the Rivera family" strip.
4. src/app/dashboard/page.tsx: family overview. Fetch /api/sample/family for the 4 members (jordan, sam, mia, rosa), and /api/trends/<id> for each. Show one card per person: name, relationship, home city, conditions, and latest-month stat tiles (avg steps, resting heart rate, sleep, plus blood pressure and glucose for Jordan and Rosa) with the change vs the previous month. Highlight Rosa as "tracked remotely from Savannah". Each card links to /family/<id>.
5. src/app/family/[memberId]/page.tsx: one person's profile.
   - Header from /api/family/<id>/profile: conditions (each with its MedlinePlus explanation title + link and the specialist type), medications (with MedlinePlus link).
   - 12-month charts from /api/trends/<id>: steps, resting heart rate, sleep, and (if present) systolic/diastolic blood pressure and glucose. The stories to make visible: Jordan's BP falls from ~138/88 to ~126/81 after he starts walking in March, plus a flu dip in late January; Rosa's BP spikes to ~151/90 in Jun–Jul and recovers in August; Sam's sleep drops in Aug–Sep; Mia's steps drop in summer.
   - "Zoom into a day" section: a date picker (range 2025-11-01 to 2026-10-31) that loads /api/vitals/<id>?date=YYYY-MM-DD and draws hourly heart rate (avg with min/max band) and steps bars. Default example dates: sam 2026-10-03 (6 PM run), jordan 2026-01-27 (flu).
   - Show a small "Loaded from Tiger Data in X ms" badge using the queryMs field when source is "Tiger Data".
   - A button "Find specialists near <city>" linking to /specialists?memberId=<id>.
6. src/app/data/page.tsx: "Powered by Tiger Data" page for the MLH Tiger Data prize. Fetch /api/tiger/stats and show: 2.1M minute readings, chunks, compression before/after MB and % saved, the 3 continuous aggregates by name, and the benchmark (raw vs continuous aggregate ms and speedup) as a bar chart. Add one sentence each explaining hypertables, continuous aggregates and compression in plain language. Also show /api/tiger/cohort?condition=hypertension as a small chart comparing Jordan and Rosa's monthly systolic BP.
7. Handle loading states (skeletons) and errors (friendly message, never a blank page).

PART C: TEST, THEN OPEN A PULL REQUEST
1. Run npm run lint and npm run build; fix everything until both pass.
2. With the dev server running, open every page via curl to confirm they return 200, and tell me how to view them in my browser: code-server Ports tab, port 3001, globe icon.
3. Update README.md "Built during the hackathon" with what we built, and in docs/DEVPOST.md replace the "[WHEN BUILT: dashboard UI]" and "[WHEN BUILT: intraday chart UI]" markers with one accurate sentence each.
4. Commit in small logical commits with clear messages, push the branch, and open a PR with gh pr create (title + a body listing pages built, how to test, and screenshots described). Never commit .env.local.
5. Give me the PR link and the Vercel preview link (it appears as a check on the PR after a minute) so I can send them to Cam for review.
```

---

## Ish: Gemini check-in, summaries, Chert
```
You are helping me (Ish, AI & Video Engineer) on iCare, our Emory Hacks 2026 project. Read CLAUDE.md, QUICKSTART.md, docs/SAMPLE-DATA.md and docs/MEDICAL-DATA.md first, and follow every rule in CLAUDE.md, especially the safety rules: iCare never diagnoses, never invents doses or drugs, always says "not medical advice", and tells people to seek care for anything serious. Work step by step, tell me what you are doing, and stop and ask me if anything fails twice.

PART A: VERIFY MY ENVIRONMENT (do not skip)
1. Confirm we are in the Coder workspace in ~/EmoryHacks2026 (pwd, node --version v22+, gh auth status logged in). If the repo is missing run: curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash
2. git checkout main && git pull && npm install
3. Check .env.local: report only "set" or "empty" (NEVER print values) for GEMINI_API_KEY, GEMINI_MODEL, TIGER_DATABASE_URL. GEMINI_API_KEY and TIGER_DATABASE_URL must be set; if not, tell me to get them from Cam and wait. GEMINI_MODEL may be empty (the default is gemini-3.5-flash-lite in src/lib/gemini.ts).
4. Write a tiny throwaway script (do not commit it) that imports getGemini and GEMINI_MODEL from src/lib/gemini.ts and asks the model to reply "iCare ready". Show me the reply and how long it took. Delete the script.
5. Start npm run dev in the background (port 3001) and curl /api/health, /api/family/jordan/profile and /api/trends/rosa to confirm the data we will feed Gemini.
6. git checkout -b ish/gemini

PART B: BUILD THE GEMINI FEATURES (my area: AI logic, prompts, check-in, summaries)
Use the existing client: import { getGemini, GEMINI_MODEL } from "@/lib/gemini"; call ai.models.generateContent({ model: GEMINI_MODEL, contents, config: { systemInstruction, temperature: 0.4 } }) and read response.text. Server-side only; never expose the key to the browser. In API routes, call the library functions directly instead of fetching our own HTTP routes: getMember / getMonthlySummaries / getFamily from src/lib/sample-data/health.ts, getTrendsFromTiger and tigerConfigured from src/lib/tiger.ts (use Tiger when configured, otherwise the sample summaries), lookupCondition from src/lib/medical/conditions.ts, getConditionInfo from src/lib/medical/medlineplus.ts, getDrugLabel from src/lib/medical/openfda.ts. Do not modify those library files (Jam owns them); if you need a change, tell me.

1. src/lib/ai/safety.ts: a shared system-instruction block every prompt includes: plain language at about a 6th–8th grade reading level, not medical advice, no diagnoses, no new medications or dose changes, mention uncertainty, and an emergency rule (chest pain, trouble breathing, stroke signs, fainting, suicidal thoughts -> tell the user to call 911 or go to the ER now). Also export a function that checks the user's message for those red-flag phrases BEFORE calling Gemini and returns the emergency message immediately if found.
2. src/lib/ai/context.ts: buildMemberContext(memberId) that returns a compact text summary for the prompt: name, age, relationship, conditions (with plain names), medications, and the last 12 monthly trends (steps, resting HR, sleep, BP, glucose). Keep it short to save tokens.
3. GET /api/ai/summary/[memberId]?period=month|year (src/app/api/ai/summary/[memberId]/route.ts): Gemini writes a friendly report. "month" = the latest month vs the previous month; "year" = the full 12 months, calling out the real stories in the data (Jordan's walking routine and falling BP, his January flu week; Rosa's Jun–Jul BP/glucose spike and August recovery; Sam's stressful Aug–Sep sleep; Mia's summer activity drop). Ask Gemini for JSON with fields: headline, highlights[] (3–5 short bullets), watchItems[] (things to discuss with a doctor), encouragement, and return it plus a disclaimer. Validate the JSON; if parsing fails, return the raw text. Cache results in memory per member+period so repeated demo clicks are instant.
4. POST /api/ai/checkin (src/app/api/ai/checkin/route.ts): a wellness check-in chat. Body: { memberId, messages: [{ role: "user" | "model", text }] }. Run the red-flag check first. The system instruction makes Gemini act as a warm check-in assistant that asks one question at a time (sleep, energy, pain, mood, medication adherence, any new symptoms), uses the member's context, and ends with a short summary and suggested next step (e.g. "mention this to your cardiologist"). Return { reply, done, summary? }. Limit conversation length to keep costs low.
5. POST /api/ai/explain-label (src/app/api/ai/explain-label/route.ts): body { name, readingLevel: "simple" | "standard" }. Fetch the FDA label with getDrugLabel(name), then have Gemini explain it in plain language: what it's for, the most important warnings (always keep any boxed warning), common side effects, and "ask your pharmacist" questions. Only use facts from the label text; if the label is missing, say so instead of guessing.
6. src/app/checkin/page.tsx: a simple chat UI (member picker for the 4 Riveras, message list, input box, a "start check-in" button, the disclaimer). TD owns overall design and the nav, so keep the styling simple with Tailwind and tell me what TD should polish. Also add a "Get my monthly / yearly summary" panel on this page that calls /api/ai/summary.
7. Test every route with curl (including a red-flag message like "I have chest pain" that must return the emergency response without calling Gemini) and show me sample outputs.

PART C: CHERT RESEARCH (do NOT guess Chert's API)
1. Ask me for the Chert developer docs, SDK link or sponsor instructions. If I don't have them yet, create docs/CHERT.md with: what we need from Chert (starting a FaceTime-style video session from the check-in page, passing the conversation or a transcript to /api/ai/checkin), the open questions to ask the Chert sponsor, and a fallback plan (browser video via getUserMedia + our text/voice check-in) so the demo works either way.
2. Once I give you the docs, read them and propose an integration plan before writing code. Add any Chert variable names (no values) to .env.example.

PART D: TEST, THEN OPEN A PULL REQUEST
1. npm run lint and npm run build must pass.
2. Update README.md "Built during the hackathon" and docs/DEVPOST.md: replace the Gemini "[WHEN BUILT]" markers and fill the "Best Use of Gemini API" prize line with exactly how Gemini is used (check-in chat, monthly/yearly summaries, label explanations, safety guardrails).
3. Small clear commits, push, gh pr create with a body listing the routes, how to test each with curl, and example outputs. Never commit .env.local.
4. Give me the PR link and the Vercel preview link to send to Cam.
```

---

## Jam: Typesense search, medicine and specialist pages
```
You are helping me (Jam, Search & Backend Engineer) on iCare, our Emory Hacks 2026 project. Read CLAUDE.md, QUICKSTART.md, docs/MEDICAL-DATA.md, docs/SAMPLE-DATA.md and docs/API-KEYS.md first, and follow every rule in CLAUDE.md. Work step by step, tell me what you are doing, and stop and ask me if anything fails twice.

PART A: VERIFY MY ENVIRONMENT (do not skip)
1. Confirm we are in the Coder workspace in ~/EmoryHacks2026 (pwd, node --version v22+, gh auth status logged in). If the repo is missing run: curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash
2. git checkout main && git pull && npm install
3. Check .env.local: report only "set" or "empty" (NEVER print values) for TYPESENSE_HOST, TYPESENSE_API_KEY, NEXT_PUBLIC_TYPESENSE_SEARCH_KEY, TIGER_DATABASE_URL. If any are empty, tell me to get them from Cam and wait. Note: my TIGER_DATABASE_URL is a READ-ONLY teammate login; never try to change the database schema or data. Cam runs any database writes.
4. Confirm Typesense is seeded: write a tiny throwaway script (do not commit it) using getTypesense() from src/lib/typesense.ts to search the "medicines" collection for "allergies" with query_by "genericName,allBrandNames,commonUses,drugClass,fdaUses" and show the hit names (expect cetirizine, loratadine, ...). Delete the script. If the collection is missing, tell me (Cam can run npm run seed:typesense).
5. Start npm run dev in the background (port 3001) and curl /api/health, /api/medicines/search?q=zyrtec, /api/medicines/lisinopril and /api/specialists?memberId=rosa&limit=2 to see the current responses.
6. git checkout -b jam/search

PART B: BACKEND (my area: search, API routes, data libraries in src/lib/ and src/app/api/)
1. Upgrade src/app/api/medicines/search/route.ts to use Typesense when TYPESENSE_HOST and TYPESENSE_API_KEY are set: search the "medicines" collection with query_by "genericName,allBrandNames,commonUses,drugClass,fdaUses", typo tolerance on, facet_by "drugClass,prescriptionRequired", and return highlights. Keep the existing RxNorm normalization and the openFDA fallback when there are fewer than 3 hits. Keep the response shape backward compatible (query, rxnorm, count, results[], disclaimer) and add "source", "facets" and "searchMs". If Typesense errors, fall back to the current local logic so the demo never breaks.
2. Add optional filters: ?rx=true|false and ?class=<drugClass>.
3. Keep the code style of src/lib/medical/ (small typed functions, comments explaining each public data source). Do not touch src/lib/ai/ (Ish) or src/components/ and layout.tsx (TD).

PART C: PAGES (coordinate styling with TD; use plain Tailwind and TD's components from src/components/ if they exist on main, otherwise simple Tailwind)
1. src/app/medicines/page.tsx: search box with live results (debounced ~250 ms) calling /api/medicines/search, filter chips from the facets, a "Prescription / Over the counter" badge, and a voice search (microphone) button using the browser Web Speech API (window.SpeechRecognition or webkitSpeechRecognition; hide the button if unsupported). Show the RxNorm match line, e.g. "Showing results for cetirizine (you searched zyrtec)". Example searches to test: zyrtec, wal-zyr, heartburn, insomnia, lisinoprl (typo).
2. src/app/medicines/[name]/page.tsx: detail page from /api/medicines/<name>: name, brands, class, uses, FDA boxed warning in a red callout when present, warnings, side effects, interactions, "Read the full FDA label" (dailyMedUrl) and "Plain-language guide" (MedlinePlus url) links, and the disclaimer. Leave a placeholder button "Explain this label simply" that will call Ish's /api/ai/explain-label once it exists (just disable it if the route returns 404).
3. src/app/specialists/page.tsx: supports ?memberId= (from TD's family pages): show that member's specialist groups from /api/specialists?memberId=<id> (specialty, which conditions it's for, providers with name, credential, address, phone as a tel: link). Also a free search form: specialty dropdown (Cardiovascular Disease, Endocrinology, Diabetes & Metabolism, Allergy & Immunology, Pediatrics, Pulmonary Disease, Family Medicine) + city/state or ZIP. Note on the page: "Public directory data from the NPI Registry. iCare suggests, it doesn't endorse or book."
4. Image search (stretch, only if time allows): a "Photo of a pill bottle" upload that sends the image to a server route which asks Gemini to read only the drug name from the label, then runs the normal search. Coordinate with Ish before building it (Gemini is Ish's area).

PART D: TEST, THEN OPEN A PULL REQUEST
1. npm run lint and npm run build must pass. Curl every route and page and show me the results, including searchMs and source "Typesense".
2. Update README.md "Built during the hackathon", docs/MEDICAL-DATA.md (route table) and docs/DEVPOST.md (remove the Typesense "[CHECK]" and the voice/image "[WHEN BUILT]" markers with accurate sentences).
3. Small clear commits, push, gh pr create with a body listing what changed and how to test. Never commit .env.local.
4. Give me the PR link and the Vercel preview link to send to Cam.
```

---

## Cam: reviewing a pull request
Replace `<NUMBER>` with the PR number, or just tell Claude "review PR 13".
```
I'm Cam, the Lead on iCare. Read CLAUDE.md. Review pull request #<NUMBER> on GldnCh/EmoryHacks2026 with gh: summarize what it changes in plain language, check it follows CLAUDE.md (no secrets or .env.local committed, no real patient data, disclaimers present, stays in the author's area, README credits updated for new libraries), check out the branch, run npm install, npm run lint and npm run build, start the app on port 3001 and test the pages/routes it adds. Also open the PR's Vercel preview link and check it works. Then tell me: what works, any problems (most important first), and whether you recommend merging. Do not merge until I say "merge PR <NUMBER>".
```

## Round 2 prompts (after the first PRs merged)
Use these for the next tasks. Each starts by syncing with `main`.

| Teammate | Task | Branch |
|---|---|---|
| Ish | Push the check-in work now, sync with main, finish safely | `ish/gemini` |
| Jam | Search polish + family medicine chips | `jam/search-polish` |
| TD | Demo-flow polish + phone check | `td/demo-polish` |

### Ish (round 2): push the check-in work now, then finish
```
I'm Ish on iCare. Read CLAUDE.md and docs/WORKFLOW.md first and follow them. Priority: get my work onto GitHub NOW so Cam can review it; I can keep pushing to the same branch afterwards. Merge cutoff is Sun 6:30AM.

1. Show me git status and git branch -vv in ~/EmoryHacks2026. Commit any uncommitted work to my branch ish/gemini (create it if needed; never commit to main). Never commit .env.local or any key.
2. Sync with main: git fetch origin && git merge origin/main, then npm install. Main now has TD's dashboard/redesign and Jam's medicines + specialists pages. Jam already fixed the openFDA combination-label bug and Cam fixed RxNorm combination brands, so do NOT re-fix those. Resolve any conflicts and show me what you changed.
3. Make sure these work and are safe even if Chert or LiveKit is unavailable:
   - /checkin (browser chat fallback) works on its own with only GEMINI_API_KEY set.
   - The red-flag check (e.g. "I have chest pain") returns the 911 message WITHOUT calling Gemini.
   - Any LiveKit/Chert code is optional: if its env vars are missing, the page hides the video option instead of crashing.
4. Jam's medicine detail page has a disabled "Explain this label simply" button that POSTs { name, label } to /api/ai/explain-label and displays the "explanation" (or "text"/"summary") field. If you built that route, make sure it accepts that body and returns { explanation, disclaimer }. If not, add it: fetch the label with getDrugLabel(name), explain only facts from the label, keep any boxed warning, end with "ask your pharmacist".
5. Add README credits for every new library/service (LiveKit Agents, Gemini Live, Chert, anything else in package.json). Add any new variable NAMES (no values) to .env.example and list them for me so Cam can add them to Vercel. Update docs/DEVPOST.md Gemini/Chert lines with exactly what works (don't claim anything that doesn't).
6. npm run lint and npm run build must pass. Start the app on port 3001 and curl /checkin, /api/ai/summary/rosa?period=year, the check-in route with a normal message and a red-flag message, and /api/ai/explain-label with {"name":"lisinopril"}. Show me the outputs.
7. Push and open the PR with gh pr create: list routes/pages, new libraries, new env var names, how to test, and what still depends on Chert. Give me the PR link and the Vercel preview link to send to Cam.
```

### Jam (round 2): search polish + family medicine chips
```
I'm Jam on iCare. Read CLAUDE.md and docs/WORKFLOW.md first and follow them. Merge cutoff is Sun 6:30AM.

1. git checkout main && git pull && npm install, then git checkout -b jam/search-polish.
2. Fix messy openFDA results in /api/medicines/search: try q=allergy. A homeopathic product with a 300-character ingredient-list name appears. Skip openFDA labels that are homeopathic or have very long / multi-ingredient generic names (e.g. more than ~60 characters or containing ", " lists), and cap displayed names at a sensible length. Keep our own list and Typesense results unchanged. Show me before/after results for allergy, heartburn and insomnia.
3. Fix the repeated FDA boxed warning on /medicines/<name>: on /medicines/lisinopril the warning text appears twice (the FDA text contains it twice). De-duplicate repeated sentences/paragraphs before displaying, without dropping any distinct warning. Tell me where you put the helper.
4. Add "Family medicines" chips to /medicines: one group per family member (Jordan, Sam, Mia, Rosa) showing their medications from /api/family/<id>/profile (e.g. Rosa: metformin, amlodipine, atorvastatin). Tapping a chip opens /medicines/<name>. Support /medicines?member=rosa to pre-select Rosa's group. Keep it compact on phones. Use TD's components.
5. Do NOT build photo search yet (it waits for Ish's Gemini PR), and do NOT add any "ask your pharmacist" advice text until Cam approves the exact wording.
6. npm run lint and npm run build must pass. Start on port 3001, test /medicines, /medicines?member=rosa, /medicines/lisinopril, the three searches above, and show me results.
7. Update README "Built" list if needed. Commit, push, gh pr create (what changed + how to test). Give me the PR link and the Vercel preview link to send to Cam.
```

### TD (round 2): demo-flow polish + phone check
```
I'm TD on iCare. Read CLAUDE.md, docs/WORKFLOW.md and docs/DEMO.md first and follow them. Merge cutoff is Sun 6:30AM.

1. git checkout main && git pull && npm install, then git checkout -b td/demo-polish.
2. Demo flow: on /family/<id>, open the 12-month trends on the BP tab by default for members who have blood pressure data (Jordan, Rosa), and Steps for others. Support ?tab=bp|steps|heart|sleep|glucose in the URL so the demo can link straight to it.
3. Connect the pages: on /family/<id>, make each medication name link to /medicines/<name> (Jam's detail page), and add a "See all of <name>'s medicines" link to /medicines?member=<id> (Jam is adding that view; until it merges the link still opens /medicines safely).
4. Check the Medicines and Specialists pages Jam built (/medicines, /medicines/lisinopril, /specialists?memberId=rosa) for visual consistency with your design system: spacing, cards, headers, mobile layout. Only fix styling in shared components or globals.css; if a page file needs a change, list it for me so Jam can do it, unless it's a one-line class fix.
5. Phone check: run npm run build and npm start on port 3001, then help me open it on my real phone (via the Coder port link). List anything broken at phone width (bottom tab bar, charts, long medicine names, specialist phone buttons) and fix what's in your area.
6. npm run lint and npm run build must pass. Commit, push, gh pr create with before/after notes. Give me the PR link and the Vercel preview link to send to Cam.
```

---

## Tips for everyone
- **Start each Claude session with:** "Pull the latest main, then switch to my branch."
- **Stuck?** Paste the exact error into Claude and say which part (A, B, C...) you're on.
- **After your PR merges,** start the next task from a fresh branch off `main`.
- **Never** paste keys into Claude, GitHub or a group chat. They only go in `.env.local`.
