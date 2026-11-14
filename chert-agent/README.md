# iCare FaceTime check-in agent (Chert + LiveKit + Gemini Live)

FaceTime iCare's Chert line and an AI wellness check-in answers with an animated face. It asks who is calling (Jordan, Sam, Mia's parent or Rosa), then runs the same check-in as the `/checkin` page: one question at a time about sleep, energy, pain, mood, medications and new symptoms, personalized with that person's trends, ending with a short summary and a next step.

**Not medical advice.** The agent never diagnoses or suggests medicines or doses. Every sentence the caller says goes through iCare's emergency check; chest pain, trouble breathing, stroke signs, fainting or suicidal thoughts make it read the 911/988 message.

Owner: Ish. Started from Chert's video starter (`chert new --video`, `@trychert/facetime`). `chert-rooms.mjs` and `greet.mjs` are Chert's starter files, unchanged. `agent.mjs` is ours, and so is the friendly animated face in `face.mjs` (redrawn during the hackathon; only its file layout and `drawFace(tick, speaking)` interface come from the starter).

## How it works
```
iPhone FaceTime ──> Chert line (Mac bridge) ──> LiveKit room ──> this agent (Gemini Live voice)
                                                                    │
                                     iCare app  <────────────────────┘
                                     GET  /api/ai/voice-prompt  safety rules + check-in steps + family trends (Tiger Data)
                                     POST /api/ai/red-flag      emergency check on each caller sentence
                                     POST /api/ai/call-summary  when the call ends: summary saved to the caller's history
```
The prompts and safety rules live in the iCare app (`src/lib/ai/`), not here, so the chat and the FaceTime agent always follow the same rules.

## Run it (Coder workspace, 3 terminals)
1. **Keys** (once): fill `chert-agent/.env.local` (copy of `.env.example`). `GEMINI_API_KEY` is the app's key. `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` come from one project at https://cloud.livekit.io (Settings -> API keys). Never paste keys in chat or commit them.
2. **Terminal 1, the iCare app:** `cd ~/EmoryHacks2026 && npm run dev` (port 3001; the agent reads `IDOC_API_URL`).
3. **Terminal 2, the agent:** `cd ~/EmoryHacks2026/chert-agent && npm install && npm start`
4. **Terminal 3, Chert:**
   ```
   cd ~/EmoryHacks2026/chert-agent
   npx --yes @trychert/facetime@0.1.0-beta.21 doctor --agent idoc-checkin
   npx --yes @trychert/facetime@0.1.0-beta.21 dev --agent idoc-checkin
   ```
   Wait for `agent_warm`, then FaceTime the line (**+1 628-224-4223** on our trial) with **FaceTime Video**.
5. Stop `chert dev` with **Ctrl+C** (never kill -9; the line stays held). After changing `agent.mjs`, restart terminals 2 and 3.

## Limits (Chert free trial)
50 FaceTime minutes total, 5 minutes per call, one call at a time, valid 48 hours from activation (trials started before Nov 18, 2026). If no agent is connected for a while, the trial line can go back to the pool; run `chert onboard` again and the number may change.

## Settings (`.env.local`)
| Variable | What |
|---|---|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | One LiveKit Cloud project (secret) |
| `GEMINI_API_KEY` | Gemini key (secret), same as the app |
| `AGENT_NAME` | `idoc-checkin` (must match `chert dev --agent`) |
| `IDOC_API_URL` | `http://localhost:3001`, or `https://icare-wall-e9.vercel.app` once merged |
| `GEMINI_LIVE_MODEL` | Optional. Default `gemini-2.5-flash-native-audio-preview-12-2025` |
| `GEMINI_LIVE_VOICE` | Optional. Default `Sulafat` (warm) |

More: `docs/CHERT.md`, and Chert's rules for coding agents in `AGENTS.md`.
