# IDoc

> Family telehealth platform: AI-led wellness check-ins over Chert FaceTime, medicine search, specialist finder, family health tracking, and monthly/yearly health trends.
> Built at Emory Hacks 2026 (Healthcare track). **Not medical advice.** Demo uses fabricated data only.

**🌐 Live app: https://idoc-wall-e9.vercel.app** (auto-deploys from `main`)

**👋 Teammates: start with [QUICKSTART.md](QUICKSTART.md).** Browser only, about 10 minutes, Claude Code included.

## Docs
| File | What's in it |
|---|---|
| [QUICKSTART.md](QUICKSTART.md) | Get connected: Coder workspace, setup script, keys, Claude Code |
| [CLAUDE.md](CLAUDE.md) | Team, rules, features, stack, Git workflow (Claude Code reads this automatically) |
| [docs/API-KEYS.md](docs/API-KEYS.md) | Which keys exist, who has them, adding them locally and in Vercel |
| [docs/SAMPLE-DATA.md](docs/SAMPLE-DATA.md) | The fictional Rivera family and the medicine list |
| [docs/MEDICAL-DATA.md](docs/MEDICAL-DATA.md) | Public medical databases, Tiger Data, and every API route |
| [docs/TEAM-PROMPTS.md](docs/TEAM-PROMPTS.md) | Copy-paste Claude Code prompts for each teammate's task, plus the PR review prompt |
| [docs/DEVPOST.md](docs/DEVPOST.md) | Submission draft and pre-submit checklist |

## What we built vs. what we used
Emory Hacks requires separating original work from frameworks. Update this as features land.

**Built during the hackathon (after 8PM Fri Nov 13, 2026):**
- The IDoc Next.js app and its API routes
- The Rivera family sample-data generator (daily and minute-level vitals) and the 38-medicine list
- Connectors for openFDA, RxNorm, MedlinePlus, NLM Clinical Tables and the NPI Registry, with condition-to-specialist matching
- Tiger Data schema (hypertables, continuous aggregates, compression), seed script and trend/cohort queries
- Typesense indexing enriched with RxNorm and FDA data
- (add UI, Gemini and Chert features as they land)

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
