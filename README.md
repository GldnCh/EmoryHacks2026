# IDoc

> AI telehealth platform: AI-led wellness checkups over Chert FaceTime, voice and image medicine search, specialist finder, family health tracking, and monthly/yearly health summaries.
> Built at Emory Hacks 2026 (Healthcare track). **Not medical advice.** Demo uses fabricated data only.

**🌐 Live app: https://idoc-wall-e9.vercel.app** (auto-deploys from `main`)

## Run locally
```
npm install
cp .env.example .env.local   # fill in keys: see docs/API-KEYS.md
npm run dev
```
Open http://localhost:3000, then `/api/health` to check which keys are configured.

New to the team? Start with the **Onboarding** section in [CLAUDE.md](CLAUDE.md).

## What we built vs. what we used
Emory Hacks requires separating original work from frameworks. Update this as you go.

**Built during the hackathon (after 8PM Fri Nov 13, 2026):**
- [ ] (add features as they're built)

**Frameworks, libraries and services used:**
- Next.js, React, TypeScript, Tailwind CSS (scaffolded with `create-next-app`)
- Google Gemini API (`@google/genai`)
- Typesense Cloud (`typesense`)
- Tiger Data / TimescaleDB (`pg`): our database for health history
- Public data: openFDA (U.S. FDA), RxNorm/RxNav, MedlinePlus Connect and Clinical Tables (U.S. National Library of Medicine), NPI Registry (CMS)
- Chert
- Coder (dev environments), Vercel (hosting)

## Team
- Cam — Lead / Product & Pitch
- Ish — AI & Video (Chert + Gemini)
- Jam — Search & Backend (Typesense + Tiger Data)
- TD — Frontend & Apple Health
