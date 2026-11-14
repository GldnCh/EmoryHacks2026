// iCare FaceTime check-in agent. Owner: Ish.
// Built from Chert's video starter (chert new --video): a LiveKit agent that answers iCare's Chert FaceTime line.
// Chert's rules this keeps: join the room at once, wait for the caller before opening a paid model session,
// greet only on bridge_ready (within 10 s), publish exactly one audio track plus one camera track (the face).
//
// iCare's part:
// - The brain is Gemini Live (native audio) through LiveKit's Google plugin, on our GEMINI_API_KEY.
// - Prompts and safety rules are NOT copied here: they come from iCare's /api/ai/voice-prompt, the same
//   SAFETY_RULES and check-in steps the text chat at /checkin uses, plus the Rivera family's trends.
// - Every sentence the caller says is checked by iCare's /api/ai/red-flag. On an emergency phrase the agent
//   interrupts and reads iCare's exact 911/988 message.
// - When the call ends, the transcript goes to iCare's /api/ai/call-summary, which saves a short summary
//   (not the transcript) to the caller's check-in history in Tiger Data.
import { fileURLToPath } from 'node:url';
import { AutoSubscribe, defineAgent, voice } from '@livekit/agents';
import { realtime } from '@livekit/agents-plugin-google';
import { LocalVideoTrack, TrackSource, VideoBufferType, VideoFrame, VideoSource } from '@livekit/rtc-node';
import { drawFace, FPS, HEIGHT, WIDTH } from './face.mjs';
import { runAgent } from './chert-rooms.mjs';
import { greetOnBridgeReady } from './greet.mjs';

const IDOC_API_URL = (process.env.IDOC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025';
// Sulafat is Gemini's "warm" voice, chosen so callers feel welcome.
const VOICE = process.env.GEMINI_LIVE_VOICE || 'Sulafat';

// Used only if iCare's API can't be reached: still safe, just not personalized.
const FALLBACK = {
  instructions: `You are iCare's AI wellness check-in assistant on a FaceTime call. You are not a doctor and nothing you say is medical advice.
Never diagnose, never suggest medicines or dose changes, and never invent facts. Use plain, friendly language and one or two short sentences per turn.
If the caller mentions chest pain, trouble breathing, stroke signs, fainting, or thoughts of suicide or self-harm, tell them to call 911 or go to the emergency room now (and call or text 988 for suicidal thoughts).
Ask one question at a time about sleep, energy, pain, mood, taking medications as prescribed, and new symptoms. Explain that you couldn't load their health trends today. End with a short summary and suggest they share anything that worries them with their clinician.`,
  greeting: "Warmly welcome the caller in one or two short, cheerful sentences: thank them for calling, say you are iCare's AI wellness check-in assistant, mention this is a friendly check-in and not medical advice, and ask how they are feeling today.",
  emergencyMessage: 'This could be an emergency. Please call 911 or go to the nearest emergency room now. If you are having thoughts of suicide or hurting yourself, call or text 988 right now.',
};

async function loadPrompt() {
  try {
    const res = await fetch(`${IDOC_API_URL}/api/ai/voice-prompt`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`[icare] Loaded check-in prompt from ${IDOC_API_URL} (family data: ${data.dataSource}).`);
    return data;
  } catch (error) {
    console.error(`[icare] Could not load ${IDOC_API_URL}/api/ai/voice-prompt (${error.message}); using the safe fallback prompt.`);
    return FALLBACK;
  }
}

/** Sends the finished call to iCare, which summarizes it and saves the summary to the caller's history. */
async function saveCallSummary(call) {
  if (!call.transcript.some(line => line.role === 'user')) return;
  try {
    const res = await fetch(`${IDOC_API_URL}/api/ai/call-summary`, {
      method: 'POST',
      // Shared secret so only this agent can save check-ins (CHERT_AGENT_TOKEN, same value as in Vercel).
      headers: { 'content-type': 'application/json', 'x-icare-agent-token': process.env.CHERT_AGENT_TOKEN ?? '' },
      body: JSON.stringify(call),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json();
    if (data.saved) console.log(`[icare] Saved the call summary to ${data.memberId ?? 'an unidentified caller'}'s check-in history (id ${data.id}).`);
    else console.error(`[icare] Call summary not saved: ${data.reason ?? data.error ?? `HTTP ${res.status}`}`);
  } catch (error) {
    console.error(`[icare] Could not send the call summary (${error.message}).`);
  }
}

async function isEmergency(text) {
  try {
    const res = await fetch(`${IDOC_API_URL}/api/ai/red-flag`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.emergency ? data : null;
  } catch {
    return null; // Gemini's own emergency rule (in the instructions) still applies
  }
}

const agent = defineAgent({
  entry: async ctx => {
    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    // Chert prepares a room before a caller exists. Join promptly so Chert can find us, and load iCare's
    // prompt while we wait, but don't open the paid Gemini session or send video until someone calls.
    const promptReady = loadPrompt();
    const caller = await ctx.waitForParticipant();
    const prompt = await promptReady;

    // Video: one camera track (the animated face), published by this agent, the one that speaks.
    const source = new VideoSource(WIDTH, HEIGHT);
    const track = LocalVideoTrack.createVideoTrack('agent-video', source);
    let tick = 0, speaking = false;
    const frame = () => source.captureFrame(new VideoFrame(drawFace(tick++, speaking), WIDTH, HEIGHT, VideoBufferType.RGBA));
    frame();
    await ctx.room.localParticipant.publishTrack(track, { source: TrackSource.SOURCE_CAMERA });
    const timer = setInterval(frame, 1000 / FPS);

    const session = new voice.AgentSession({
      llm: new realtime.RealtimeModel({
        model: MODEL,
        voice: VOICE,
        apiKey: process.env.GEMINI_API_KEY,
        temperature: 0.4,
      }),
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, event => { speaking = event.newState === 'speaking'; });

    // Keep what both sides said (Gemini transcribes the audio) so the call can be summarized when it ends.
    const call = {
      callId: caller.identity.startsWith('chert-bridge-') ? caller.identity.slice('chert-bridge-'.length) : caller.identity,
      startedAt: new Date().toISOString(),
      transcript: [],
    };
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, ({ item }) => {
      const text = item.textContent?.trim();
      if (text && (item.role === 'user' || item.role === 'assistant')) {
        call.transcript.push({ role: item.role === 'user' ? 'user' : 'model', text });
      }
    });
    // The session closes when the caller hangs up and the job then shuts down; save exactly once.
    let saved;
    const saveOnce = () => (saved ??= saveCallSummary({ ...call, endedAt: new Date().toISOString() }));
    session.on(voice.AgentSessionEventTypes.Close, () => { saveOnce(); });

    // Emergency check on every finished sentence the caller says (Gemini transcribes the caller's audio).
    let lastAlarm = 0;
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, async event => {
      if (!event.isFinal || !event.transcript?.trim()) return;
      const flag = await isEmergency(event.transcript);
      if (!flag || Date.now() - lastAlarm < 20_000) return;
      lastAlarm = Date.now();
      console.warn(`[icare] Emergency phrase heard (${flag.matched?.join(', ')}). Reading the emergency message.`);
      try { await session.interrupt(); } catch { /* nothing was playing */ }
      session.generateReply({
        instructions: `The caller may be having an emergency. Calmly say exactly this, word for word, and nothing else: "${prompt.emergencyMessage}"`,
      });
    });

    ctx.addShutdownCallback(async () => {
      clearInterval(timer);
      await session.close();
      await saveOnce();
      await track.close();
      await source.close();
    });
    await session.start({
      room: ctx.room,
      agent: new voice.Agent({ instructions: prompt.instructions }),
      record: false,
      inputOptions: {
        participantIdentity: caller.identity,
        audioEnabled: true,
        videoEnabled: false,
        textEnabled: false,
        closeOnDisconnect: true,
        deleteRoomOnClose: false,
      },
      outputOptions: { audioEnabled: true, transcriptionEnabled: false },
    });
    // Greet once when chert dev reports that FaceTime is ready (bridge_ready in the room metadata):
    // the Mac ends the call if it hears nothing within 10 seconds of that. Never greet on join alone.
    const stopGreeting = greetOnBridgeReady(ctx.room, () => session.generateReply({ instructions: prompt.greeting }));
    ctx.addShutdownCallback(async () => stopGreeting());
  },
});

export default agent;

// Your own LiveKit project when .env.local has its three LIVEKIT_ values; otherwise Chert rooms through chert dev.
runAgent(agent, { file: fileURLToPath(import.meta.url), agentName: process.env.AGENT_NAME || 'idoc-checkin' });
