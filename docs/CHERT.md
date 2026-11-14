# Chert FaceTime check-ins

Owner: Ish. Chert gives an AI agent a real Apple line: people FaceTime it from an iPhone and a Chert Mac bridges the call into a LiveKit room where our agent answers. Source of truth: Chert's agent guide at https://app.trychert.com/skills.md and https://docs.trychert.com. We follow their CLI and starter; nothing here guesses Chert's API.

## What we built
- **`chert-agent/`**: a LiveKit video agent from Chert's starter (`chert new chert-agent --video`), with OpenAI swapped for **Gemini Live** (`@livekit/agents-plugin-google`, native audio). It shows an animated face, asks who is calling, and runs iCare's wellness check-in. How to run it: `chert-agent/README.md`.
- **`GET /api/ai/voice-prompt`**: the agent's instructions: our `SAFETY_RULES` + the shared check-in steps (`src/lib/ai/checkin-prompt.ts`) + all four Rivera profiles with Tiger Data trends. One source of truth for chat and voice.
- **`POST /api/ai/red-flag`**: the same emergency-phrase check the text chat runs before Gemini. The agent checks every sentence the caller says (Gemini transcribes the audio) and on a match interrupts and reads the 911/988 message word for word. Gemini's own emergency rule is a second layer.

## Our Chert setup (no secrets here)
| | |
|---|---|
| CLI | `@trychert/facetime@0.1.0-beta.21` (`npx --yes @trychert/facetime@0.1.0-beta.21 <command>`) |
| Plan | Free trial: 50 FaceTime minutes, 5 min per call, 48 h from activation (Nov 14, 2026) |
| Line | +1 628-224-4223 (trial line; may change if released back to the pool) |
| Project | `ec102b5f-2fb8-40cb-ae39-e9687f13e848` (Ish's Chert account) |
| Agent name | `idoc-checkin` |
| LiveKit | Our own LiveKit Cloud project (trial projects can't use Chert-managed LiveKit) |

Chert sign-in lives in `~/.chert` in Ish's Coder workspace. Keys go only in `chert-agent/.env.local` (git-ignored).

## Status and what happened
1. Onboarding and iMessage phone verification: done.
2. **Chert's hosted demo call failed twice** (`bridge_remote_audio_timeout`, answered but no agent audio, ~16 s). Call IDs `4bfb47b1-7805-4082-a448-d018849b0b69` and `7e7d689e-438a-4996-a8e8-4af0322082ef`, reported to the Chert sponsor table.
3. iCare agent: built, starts cleanly, Gemini Live models verified on our key. **Waiting on LiveKit keys** for the first real call.

## Open questions for the Chert sponsor
- Why did both demo calls hit `bridge_remote_audio_timeout`? Does it affect customer agents connected with `chert dev`?
- Can the line stay connected through judging (Sun Nov 15, 8:15–11 AM) without being released back to the pool? Is `chert dev --until HH:MM` the right way to hold it?
- Can judges FaceTime the line from their own phones on the trial, or only verified phones?
- Can the caller's phone number reach the agent (room/participant metadata) so we can skip "who is calling?" for known family phones?

## Fallback (the demo works either way)
- **Browser check-in** at `/checkin`: the same Gemini check-in as text chat, with the same safety rules, plus monthly/yearly summaries.
- **Stretch:** a "Video check-in" button on `/checkin` that shows the user's own camera with `getUserMedia` next to the chat, and browser speech (Web Speech API) for talking instead of typing, so the pitch can show a FaceTime-style check-in even without Chert.
- **Backup video:** record a working Chert call as soon as one succeeds, for the demo video.
