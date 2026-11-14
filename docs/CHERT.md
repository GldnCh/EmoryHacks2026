# Chert FaceTime check-ins

Owner: Ish. Chert gives an AI agent a real Apple line: people FaceTime it from an iPhone and a Chert Mac bridges the call into a LiveKit room where our agent answers. Source of truth: Chert's agent guide at https://app.trychert.com/skills.md and https://docs.trychert.com. We follow their CLI and starter; nothing here guesses Chert's API.

## What we built
- **`chert-agent/`**: a LiveKit video agent from Chert's starter (`chert new chert-agent --video`), with OpenAI swapped for **Gemini Live** (`@livekit/agents-plugin-google`, native audio). It shows an animated face, asks who is calling, and runs iCare's wellness check-in. How to run it: `chert-agent/README.md`.
- **`GET /api/ai/voice-prompt`**: the agent's instructions: our `SAFETY_RULES` + the shared check-in steps (`src/lib/ai/checkin-prompt.ts`) + all four Rivera profiles with Tiger Data trends. One source of truth for chat and voice.
- **`POST /api/ai/red-flag`**: the same emergency-phrase check the text chat runs before Gemini. The agent checks every sentence the caller says (Gemini transcribes the audio) and on a match interrupts and reads the 911/988 message word for word. Gemini's own emergency rule is a second layer.
- **`POST /api/ai/call-summary`**: when a call ends, the agent sends the call transcript here. Gemini works out which family member the check-in was about and writes 2 to 5 points plus one next step, under the same `SAFETY_RULES`. The emergency check runs over everything the caller said and is saved with the summary. Only the summary is stored, never the transcript, in the Tiger Data table `checkin_summaries`.
- **`GET /api/checkins/<memberId>`**: that member's saved check-in history, newest first.
- **Voice and tone:** Gemini's warm voice **Sulafat** (override with `GEMINI_LIVE_VOICE`). The greeting thanks the caller and welcomes them, and the agent uses their first name, reacts kindly to what they share and invites them to call again. The safety rules are unchanged.

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
2. **Chert's hosted demo call failed twice** (`bridge_remote_audio_timeout`, answered but no agent audio, ~16 s). Call IDs `4bfb47b1-7805-4082-a448-d018849b0b69` and `7e7d689e-438a-4996-a8e8-4af0322082ef`, reported to the Chert sponsor table. Our own agent is not affected (see 4).
3. LiveKit Cloud keys added; `chert doctor` passes and `chert dev` holds the line with the agent warm.
4. **First real FaceTime check-in worked (Sat Nov 14, 1:40 PM ET).** See the call record below.
5. Call summaries are saved to each caller's check-in history (after Cam creates the `checkin_summaries` table; see below).

## Test call record (for judges)
Our first end-to-end call: an iPhone FaceTime Video call to our Chert line, answered by the iCare agent on Gemini Live.

| | |
|---|---|
| Call ID | `6f064a47-c460-47f3-8a32-1a5142a2abcc` |
| When | Sat Nov 14, 2026, 1:40:27 to 1:41:41 PM ET (about 74 seconds) |
| Answered | In 0.0 s; the agent loaded the check-in prompt with the Rivera family's Tiger Data trends |
| Greeting | Spoken right after FaceTime reported ready (Chert requires a greeting within 10 s) |
| Video | The agent's animated face and voice reached the iPhone |
| Conversation | 6 caller turns detected by the agent |
| Ended | The caller hung up; the agent closed cleanly |
| Result | Ish confirmed the agent responded properly |

The words of this call were not saved: the agent did not keep transcripts or summaries until this change. Every call from now on is summarized and saved, and judges can see the summaries at `GET /api/checkins/<memberId>`.

## Creating the `checkin_summaries` table (Cam, once)
Teammates' `idoc_team` login is read-only, so Cam runs this with the admin login (Tiger console SQL editor or `psql`). It's safe to re-run and changes no existing data. The `CREATE` statements match `db/tiger/schema.sql`.
```sql
CREATE TABLE IF NOT EXISTS checkin_summaries (
  id         BIGSERIAL   PRIMARY KEY,
  member_id  TEXT        REFERENCES family_members(id),
  channel    TEXT        NOT NULL,
  call_id    TEXT        UNIQUE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at   TIMESTAMPTZ NOT NULL,
  points     TEXT[]      NOT NULL,
  next_step  TEXT        NOT NULL,
  emergency  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkin_summaries_member_idx ON checkin_summaries (member_id, started_at DESC);
-- Lets the agent save summaries through a teammate's local app; idoc_team stays read-only everywhere else.
GRANT SELECT, INSERT ON checkin_summaries TO idoc_team;
GRANT USAGE ON SEQUENCE checkin_summaries_id_seq TO idoc_team;
```

## Open questions for the Chert sponsor
- Why did both demo calls hit `bridge_remote_audio_timeout`? Does it affect customer agents connected with `chert dev`?
- Can the line stay connected through judging (Sun Nov 15, 8:15–11 AM) without being released back to the pool? Is `chert dev --until HH:MM` the right way to hold it?
- Can judges FaceTime the line from their own phones on the trial, or only verified phones?
- Can the caller's phone number reach the agent (room/participant metadata) so we can skip "who is calling?" for known family phones?

## Fallback (the demo works either way)
- **Browser check-in** at `/checkin`: the same Gemini check-in as text chat, with the same safety rules, plus monthly/yearly summaries.
- **Stretch:** a "Video check-in" button on `/checkin` that shows the user's own camera with `getUserMedia` next to the chat, and browser speech (Web Speech API) for talking instead of typing, so the pitch can show a FaceTime-style check-in even without Chert.
- **Backup video:** a call now works, so record one (with the new voice) for the demo video.
