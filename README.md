# iCare

> Family telehealth platform: AI-led wellness check-ins over Chert FaceTime, medicine search, specialist finder, family health tracking, and monthly/yearly health trends.
> Built at Emory Hacks 2026 (Healthcare track). **Not medical advice.** Demo uses fabricated data only.

**🌐 Live app: https://icare-wall-e9.vercel.app** (auto-deploys from `main`)

**👋 Teammates: start with [QUICKSTART.md](QUICKSTART.md).** Browser only, about 10 minutes, Claude Code included.

## Docs
| File | What's in it |
|---|---|
| [QUICKSTART.md](QUICKSTART.md) | Get connected: Coder workspace, setup script, keys, Claude Code |
| [CLAUDE.md](CLAUDE.md) | Team, rules, features and their live status, stack (Claude Code reads this automatically) |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | How we work: branches, PRs, reviews, merges, deploys, keys, file ownership, timeline |
| [docs/API-KEYS.md](docs/API-KEYS.md) | Which keys exist, who has them, adding them locally and in Vercel |
| [docs/SAMPLE-DATA.md](docs/SAMPLE-DATA.md) | The fictional Rivera family and the medicine list |
| [docs/MEDICAL-DATA.md](docs/MEDICAL-DATA.md) | Public medical databases, Tiger Data, and every API route |
| [docs/TEAM-PROMPTS.md](docs/TEAM-PROMPTS.md) | Copy-paste Claude Code prompts for each teammate's task, plus the PR review prompt |
| [docs/DEVPOST.md](docs/DEVPOST.md) | Submission draft and pre-submit checklist |
| [docs/CHERT.md](docs/CHERT.md) | Chert FaceTime check-in agent: setup, status, open questions, fallback |
| [chert-agent/README.md](chert-agent/README.md) | How to run the FaceTime agent |
| [docs/DEMO.md](docs/DEMO.md) | 2-minute demo script, backups and likely judge questions |

## What we built vs. what we used
Emory Hacks requires separating original work from frameworks. Update this as features land.

**Built during the hackathon (after 8PM Fri Nov 13, 2026):**
- The iCare Next.js app and its API routes
- The Rivera family sample-data generator (daily and minute-level vitals) and the 38-medicine list
- Connectors for openFDA, RxNorm, MedlinePlus, NLM Clinical Tables and the NPI Registry, with condition-to-specialist matching
- Tiger Data schema (hypertables, continuous aggregates, compression), seed script and trend/cohort queries
- Typesense indexing enriched with RxNorm and FDA data
- Medicine search on Typesense (typo tolerance, facets, highlights, Rx/OTC and drug-class filters, local fallback if Typesense is down), a live search page with filter chips, voice search and "Family medicines" chips for each family member, a medicine detail page with FDA boxed warnings (repeated text removed), and a specialist finder page (per family member or any specialty near a city or ZIP)
- Typo-tolerant symptom search: misspelled uses like "insomnea" or "high blod presure" are corrected (MedlinePlus spelling suggestions, then our own medicine vocabulary, up to 3 wrong letters on long words) before searching our list and openFDA
- App shell and screens: landing page, family dashboard (latest month vs. the month before), per-person pages with 12-month trend charts and an hour-by-hour "zoom into a day" view, and a "Powered by Tiger Data" page with live storage, compression, benchmark and cohort charts
- Gemini AI layer (`src/lib/ai/`): shared safety rules, an emergency red-flag check that runs before any AI call, compact member context from Tiger Data trends, and JSON-validated Gemini calls with retry
- Gemini routes: monthly/yearly health summaries (`/api/ai/summary/<id>`), wellness check-in chat (`/api/ai/checkin`), plain-language FDA label explanations (`/api/ai/explain-label`), and the voice agent's prompt and red-flag routes
- The `/checkin` page: check-in chat, family member picker and monthly/yearly summary panel
- The Chert FaceTime check-in agent (`chert-agent/agent.mjs`): Gemini Live voice, iCare's shared prompts and safety rules, emergency check on every caller sentence

**Frameworks, libraries and services used:**
- Next.js, React, TypeScript, Tailwind CSS (scaffolded with `create-next-app`)
- Google Gemini API (`@google/genai`): `gemini-3.5-flash-lite` for text, Gemini Live native audio (`gemini-2.5-flash-native-audio-preview-12-2025`) for FaceTime voice
- Typesense Cloud (`typesense`)
- Web Speech API (built into the browser, no package): voice search on the Medicines page
- Recharts (`recharts`): charts on the dashboard, family and Tiger Data pages
- Tiger Data / TimescaleDB (`pg`): our database for health history
- Public data: openFDA (U.S. FDA), RxNorm/RxNav, MedlinePlus Connect, MedlinePlus Web Service (spelling suggestions) and Clinical Tables (U.S. National Library of Medicine), NPI Registry (CMS)
- Chert FaceTime (`@trychert/facetime` CLI); `chert-agent/` started from Chert's video-agent starter (`chert-rooms.mjs`, `greet.mjs`, `face.mjs` are Chert's files)
- LiveKit Agents for Node (`@livekit/agents`, `@livekit/rtc-node`, `@livekit/agents-plugin-google`) and LiveKit Cloud
- Coder (dev environments), Vercel (hosting)

## Team
- Cam — Lead / Product & Pitch
- Ish — AI & Video (Chert + Gemini)
- Jam — Search & Backend (Typesense + Tiger Data)
- TD — Frontend & Apple Health
