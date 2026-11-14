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

## 3. Supabase — owner: Jam
Free plan, no credit card needed.

1. Go to https://supabase.com/dashboard and sign in with GitHub.
2. Click **New project**. Choose your organization, name it `idoc`, create a strong database password (save it in a password manager and share it privately), choose a US East region, and click **Create new project**.
3. Wait for it to finish setting up (1–2 minutes).
4. Click **Connect** at the top of the project page (or go to **Project Settings → API Keys / Data API**).
5. Copy:
   - the **Project URL** (`https://xxxx.supabase.co`)
   - the **publishable** key (starts with `sb_publishable_`) or, on older projects, the **anon public** key
6. Put them in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable or anon key>
   ```
7. Add Ish, Cam and TD to the project: **Organization settings → Team → Invite**.

✅ Check: `/api/health` shows `"supabase": true`.

Notes: these two values are safe in the browser **only** if Row Level Security (RLS) is on for every table. Never use or share the **secret / service_role** key in frontend code.

---

## 3b. Tiger Data (health history database) — owner: Jam
Stores the family's daily health data as a time series, and enters us for the MLH **Best Use of Tiger Data** prize.

1. Go to https://console.cloud.timescale.com (Tiger Data's console) and sign up, e.g. with GitHub. Ask the Tiger Data / MLH table about hackathon credits if it asks for payment.
2. Click **Create service**. Choose a **Time-series** (TimescaleDB / PostgreSQL) service, the smallest size, and a US East region.
3. When it's ready, copy the **connection string** (a `postgres://...` URL that includes the password). Download the config file it offers; the password is shown only once.
4. Put it in `.env.local` (it's a secret, server-only):
   ```
   TIGER_DATABASE_URL=postgres://tsdbadmin:<password>@<host>:<port>/tsdb?sslmode=require
   ```
5. Load the sample family into it:
   ```
   npm run seed:tiger
   ```
   ✅ Expected output ends with:
   ```
   Loaded into Tiger Data: jordan=365 days, mia=365 days, rosa=365 days, sam=365 days
   ```
   (Try `npm run seed:tiger -- --dry-run` first; it needs no database.)
6. Share the connection string privately, and add it in Vercel.

✅ Check: `/api/health` shows `"tigerData": true`, and `/api/trends/jordan` says `"source": "Tiger Data"`.

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
