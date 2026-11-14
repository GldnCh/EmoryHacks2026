# Getting the API keys

Each key has one **owner** who creates it and shares it **privately** (DM or team chat) with the team. **Never** paste a key into the repo, a PR, an issue or a public channel. The repo is public.

After you receive the keys:
1. In the project folder, run `cp .env.example .env.local` (only once).
2. Open `.env.local` and paste each value after its `=` sign (no quotes, no spaces).
3. Restart `npm run dev`.
4. Open `/api/health` in the app. Each service you configured should show `true`.

> Website menus change. If a button below has a slightly different name, look for the closest match, or ask Claude and say which step you're on.

---

## 1. Gemini API key — owner: Ish
Free tier, no credit card needed.

1. Go to https://aistudio.google.com/apikey and sign in with a Google account.
2. Accept the terms if asked.
3. Click **Create API key**. If it asks for a Google Cloud project, choose **Create API key in new project**.
4. Copy the key (it starts with `AIza`).
5. Put it in `.env.local`:
   ```
   GEMINI_API_KEY=AIza...
   ```
6. Share it privately with the team.

✅ Check: `/api/health` shows `"gemini": true`.

Notes: the free tier has rate limits. If you hit them during testing, wait a minute or ask about MLH/Google credits at the sponsor table. The default model is set in `src/lib/gemini.ts`; you can override it with `GEMINI_MODEL`.

---

## 2. Typesense Cloud — owner: Jam
1. Go to https://cloud.typesense.org and **Sign in with GitHub**.
2. Click **Launch** / **New Cluster**. Choose the **smallest** memory and CPU option, a region near Atlanta (e.g. US East), and leave the other settings as default.
   - If it asks for payment, check the free-tier/trial options first and ask the Typesense sponsor table about hackathon credits before entering a card.
3. Wait for the cluster to finish provisioning (a few minutes).
4. Click **Generate API Keys**. It downloads a text file containing:
   - the **Admin API key**
   - a **Search-only API key**
   - the **host(s)**, which look like `xxxx.a1.typesense.net`
5. Put them in `.env.local` (host **without** `https://`):
   ```
   TYPESENSE_HOST=xxxx.a1.typesense.net
   TYPESENSE_API_KEY=<admin key>
   NEXT_PUBLIC_TYPESENSE_SEARCH_KEY=<search-only key>
   ```
6. Share the file contents privately. Keep the admin key out of browser code; only API routes use it.

✅ Check: `/api/health` shows `"typesense": true`.

---

## 3. Tiger Data (our database) — owner: Jam
Tiger Data (TimescaleDB, built on PostgreSQL) is IDoc's **only database**. It stores the family profiles and their daily health history as a time series, powers the monthly/yearly trend queries, and enters us for the MLH **Best Use of Tiger Data** prize.

1. Sign up through MLH's link: **https://mlh.link/tigerdata-quickstart** (Google or GitHub sign-in works). New accounts get **$1,000 in credits for 30 days**, no credit card needed. The console is at https://console.cloud.timescale.com.
   > **IDoc's database already exists** (service `idoc`, us-east-1, created by Cam). Teammates don't need their own: get `TIGER_DATABASE_URL` from Cam privately and skip to step 4.
2. Click **Create service**: **0.5 CPU** (covered by credits), **AWS US East (N. Virginia)** (same region as our Vercel app), **Development**, no add-ons. Name it `idoc`.
3. When it's ready, copy the **connection string** (a `postgres://...` URL that includes the password). Download the config file it offers; the password is shown only once.
4. Put it in `.env.local` (it's a secret, server-only):
   ```
   TIGER_DATABASE_URL=postgres://tsdbadmin:<password>@<host>:<port>/tsdb?sslmode=require
   ```
5. Load the sample family into it:
   ```
   npm run seed:tiger
   ```
   This loads profiles, 1,460 daily records and **~2.1 million minute-by-minute heart-rate/step readings**, builds 3 continuous aggregates, turns on compression and runs a speed benchmark. It takes about 3–5 minutes. ✅ Expected output (numbers will vary):
   ```
   ✓ Schema ready: family_members, health_metrics + vitals_minute hypertables, 3 continuous aggregates.
   ✓ 4 profiles and 1460 daily records loaded.
     jordan: 525,600 minute readings in 10s
     ...
   ✓ Continuous aggregates refreshed (hourly, daily, monthly) with auto-refresh policies.
   ✓ Compression on: vitals_minute 212.3 MB → 6.2 MB (97% smaller).
   ✓ Benchmark (Jordan's daily heart rate + steps for a year): raw minutes 60 ms vs continuous aggregate 24 ms.
   Loaded into Tiger Data: jordan=365 days/525,600 minutes, ...
   ```
   - `--dry-run` first checks everything without a database. `--skip-minute` loads only profiles + daily data (fast). `--reset` reloads the minute data from scratch.
6. Give teammates access if they need the console: in the Tiger Data console, open your project's settings and invite them as members (if offered). Otherwise just share the connection string privately; that's all the app needs.
7. Add the same `TIGER_DATABASE_URL` in Vercel (section 5).

Notes:
- The connection string contains the database password. Never put it in browser code, a `NEXT_PUBLIC_` variable, or the repo.
- Without it, the app still runs: `/api/trends` falls back to the built-in sample data.
- TLS: Tiger's URL ends in `?sslmode=require`. Our code (`src/lib/tiger-ca.ts`) removes it and verifies the server certificate itself against Node's public CAs **plus** Timescale's own CA (new services briefly use it). Never "fix" a certificate error by turning verification off.
- The tables are in `db/tiger/schema.sql`: `health_metrics` (a hypertable, one row per person per day) and `family_members`.

✅ Check: `/api/health` shows `"tigerData": true`, `/api/trends/jordan` says `"source": "Tiger Data"`, and `/api/tiger/stats` shows the row counts, compression savings and benchmark.

---

## 4. Chert — owner: Ish
We don't have Chert's developer docs yet.

1. Get the docs, SDK and any sign-up link from the Chert sponsor (table, Discord or Devpost page).
2. Follow their steps to create an account and get credentials.
3. Add the variable **names** to `.env.example` (no values) in a PR, and the values to your `.env.local`.
4. Update this section with the real steps so the rest of the team can follow them.

---

## 5. Vercel (hosting) — owner: Cam
Do this once the app runs locally.

1. Go to https://vercel.com and sign up with GitHub.
2. Click **Add New → Project**, find `GldnCh/EmoryHacks2026` and click **Import**. If it's not listed, click **Adjust GitHub App Permissions** and allow the repo.
3. Framework preset: **Next.js** (auto-detected). Open **Environment Variables** and add every variable from `.env.local` with its value.
4. Click **Deploy**. Every merge into `main` redeploys automatically, and each PR gets its own preview link.
5. To add or change a key later: **Project → Settings → Environment Variables**, then redeploy.

---

## Adding a new key later
1. Add the variable **name** (no value) to `.env.example` with a comment saying the owner.
2. Add a section to this file explaining how to get it.
3. Add the value in Vercel.
4. Tell the team and share the value privately.
