# API keys

The team's keys already exist. **Cam holds and distributes all of them** by private DM, and each teammate gets only what they need. **Never** paste a key into the repo, a PR, an issue, a group channel or a prompt to Claude; the repo is public.

## Using the keys in your workspace
1. `.env.local` was created by the setup script (or run `cp .env.example .env.local` once in `~/EmoryHacks2026`).
2. Open it: `code ~/EmoryHacks2026/.env.local`
3. Paste each value right after its `=` (no spaces, no quotes) and save.
4. Restart `npm run dev`, then open `/api/health`. Each service with a key shows `true`.

| Variable | What it's for | Get it from | Server-only? |
|---|---|---|---|
| `GEMINI_API_KEY` | AI check-ins and summaries | Cam → Ish | ✅ yes |
| `GEMINI_MODEL` | Optional model override (default `gemini-3.5-flash-lite`, set in `src/lib/gemini.ts`) | — | ✅ yes |
| `TYPESENSE_HOST`, `TYPESENSE_API_KEY` | Medicine search (admin key) | Cam → Jam | ✅ yes |
| `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY` | Search-only key, safe in the browser | Cam → Jam | ❌ public by design |
| `TIGER_DATABASE_URL` | Tiger Data database (health history). **Teammates get the read-only `idoc_team` login**; only Cam has the admin login | Cam → everyone | ✅ yes |
| `CHERT_AGENT_TOKEN` | Shared secret so only the FaceTime agent can save check-in summaries. Same value in Vercel (Production + Preview, Sensitive) and in `chert-agent/.env.local`. Without it, production refuses check-in saves | Cam → Ish | ✅ yes |
| Chert / LiveKit variables | Video check-ins: Ish adds the names to `.env.example` in their PR and sends values to Cam for Vercel | Ish | ✅ yes |
| `OPENFDA_API_KEY` | Optional, only if we hit openFDA's free daily limit | — | ✅ yes |

The public medical databases (openFDA, RxNorm, MedlinePlus, Clinical Tables, NPI Registry) need **no keys**.

## Live site (Vercel)
The live app reads keys from Vercel, not from anyone's `.env.local`. **Cam** adds them: Vercel → project `idoc` → **Settings → Environment Variables** → add each key as **Sensitive**, for **Production** and **Preview** → then **Redeploy** the latest production deployment (keys are only picked up by a new deploy).

Already in Vercel (**Production and Preview**): `TIGER_DATABASE_URL` (admin), `GEMINI_API_KEY`, `GEMINI_MODEL`, `TYPESENSE_HOST`, `TYPESENSE_API_KEY`, `NEXT_PUBLIC_TYPESENSE_SEARCH_KEY`. Typesense is seeded (38 medicines).

## Data setup that uses the keys
- **Typesense:** after `TYPESENSE_*` is in your `.env.local`, run `npm run seed:typesense` once (any teammate). It loads the 38 medicines, enriched with RxNorm brand names and FDA "uses" text, and ends with `Imported 38/38 medicines into Typesense.`
- **Tiger Data:** already loaded (2.1M readings, service `idoc` in us-east-1). Teammates use the **read-only teammate login** (`idoc_team`) from Cam; only Cam has the admin URL. `npm run seed:tiger -- --dry-run` checks the script without touching the database.

## Adding a new key
1. Add the variable **name** (no value) to `.env.example`, with a comment saying who holds it.
2. Add a row to the table above.
3. Share the value privately; Cam adds it in Vercel.

## If a key ever needs to be replaced
Gemini: https://aistudio.google.com/apikey · Typesense: https://cloud.typesense.org · Tiger Data: https://console.cloud.timescale.com (sign-up via https://mlh.link/tigerdata-quickstart includes $1,000 in credits). Database TLS is handled in `src/lib/tiger-ca.ts`; never disable certificate verification.
