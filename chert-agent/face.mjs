// The picture the caller sees: one RGBA frame per call to drawFace. Owner: Ish.
// Started from Chert's starter face; redrawn as iCare's check-in companion: a glowing glass heart with soft
// colored light flowing inside it. It breathes gently while listening, and while it talks it swells, glows
// brighter, and the light inside moves faster.
// Plain JavaScript with no dependencies. The heart is a signed distance field with 1-pixel edge blending, so
// edges stay smooth. The light always moves, which also makes a frozen video easy to spot.
export const WIDTH = 640;
export const HEIGHT = 360;
export const FPS = 30;

const DT = 1 / FPS;
// Heart size in pixels: the heart is about 1.1 of these units tall and 1.2 wide.
const SIZE = 230;
// Heart units (y up) are shifted so the heart's middle sits on the frame's center point.
const MID = 0.55;
const HALO_REACH = 64;

// Colors are 0 to 1 here and mapped to bytes at the end.
const BG_TOP = [0.05, 0.05, 0.1];
const BG_BOTTOM = [0.015, 0.015, 0.04];
const GLASS = [0.07, 0.03, 0.14];
const RIM = [0.55, 0.45, 1.0];
const HALO_TINT = [0.5, 0.3, 1.0];
// The lights that drift inside the heart: color, size, a home spot (heart units), and a Lissajous path around it.
// Each has its own home so the colors stay distinct instead of merging into white.
const LIGHTS = [
  { color: [1.0, 0.18, 0.6], r: 0.32, hx: -0.24, hy: 0.78, ax: 0.12, ay: 0.12, fx: 0.31, fy: 0.47, px: 0.0, py: 1.3 },
  { color: [0.12, 0.4, 1.0], r: 0.32, hx: 0.24, hy: 0.78, ax: 0.12, ay: 0.13, fx: 0.43, fy: 0.29, px: 2.1, py: 0.4 },
  { color: [0.55, 0.22, 1.0], r: 0.3, hx: 0.0, hy: 0.52, ax: 0.16, ay: 0.1, fx: 0.23, fy: 0.37, px: 4.0, py: 2.6 },
  { color: [0.1, 0.95, 0.95], r: 0.25, hx: 0.0, hy: 0.3, ax: 0.1, ay: 0.08, fx: 0.37, fy: 0.53, px: 5.2, py: 3.9 },
];

// The background never changes, so it is drawn once and copied into every frame.
const BACKGROUND = (() => {
  const px = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / (HEIGHT - 1);
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      // A slight vignette keeps the eye on the heart.
      const v = 1 - 0.35 * Math.hypot((x - WIDTH / 2) / WIDTH, (y - HEIGHT / 2) / HEIGHT) ** 2 * 4;
      for (let c = 0; c < 3; c++) px[i + c] = 255 * v * (BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * t);
      px[i + 3] = 255;
    }
  }
  return px;
})();

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Edge coverage for a signed distance: 1 inside, 0 outside, blended across one pixel. */
const cover = d => clamp01(0.5 - d);
/** Soft saturation: bright light rolls off smoothly instead of clipping. */
const tone = v => (v <= 0 ? 0 : (1.4 * v) / (1 + 1.4 * v));
/** A smooth, cheap bell curve: 1 at q = 0, easing to exactly 0 at q = 1 (q is a squared, normalized distance). */
const bell = q => (q >= 1 ? 0 : (1 - q) * (1 - q) * (1 - q));

/**
 * Exact signed distance to a heart, in heart units with y pointing up: the tip is at (0, 0) and the
 * tops of the two lobes reach about y = 1.1. From Inigo Quilez's 2D distance functions.
 */
function heart(x, y) {
  x = Math.abs(x);
  if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2 / 4;
  const m = 0.5 * Math.max(x + y, 0);
  return Math.sqrt(Math.min(x * x + (y - 1) ** 2, (x - m) ** 2 + (y - m) ** 2)) * Math.sign(x - y);
}

// Animation state carried between frames, so speech eases in and out instead of jumping.
// Each call runs in its own agent process; a tick that is not the next one starts fresh.
const state = { tick: -1, time: 0, flow: 0, level: 0 };

/** How loud the speech pulse should be right now (0 to 1): an uneven, syllable-like swell while talking. */
function speechTarget(time, speaking) {
  if (!speaking) return 0;
  const syllables = 0.5 + 0.5 * Math.sin(time * 9.0);
  const phrases = 0.65 + 0.35 * Math.sin(time * 3.1 + 1.0);
  return 0.45 + 0.55 * syllables * phrases;
}

/** A soft resting heartbeat (0 to 1): a "lub" and a gentler "dub" about 60 times a minute. */
function restingBeat(time) {
  const p = time % 1;
  return Math.exp(-(((p - 0.12) / 0.09) ** 2)) + 0.55 * Math.exp(-(((p - 0.36) / 0.09) ** 2));
}

/**
 * iCare's glowing heart. `tick` counts frames; `speaking` is true while the agent talks.
 * Returns WIDTH x HEIGHT pixels, four bytes each: red, green, blue, alpha.
 */
export function drawFace(tick, speaking) {
  if (tick !== state.tick + 1) Object.assign(state, { time: 0, flow: 0, level: 0 });
  state.tick = tick;
  state.time += DT;
  const target = speechTarget(state.time, speaking);
  // Rise quickly when a sound starts, fall back more slowly, like a VU meter.
  state.level += (target - state.level) * (target > state.level ? 0.35 : 0.12);
  const level = state.level;
  // The light inside flows faster while talking.
  state.flow += DT * (0.6 + 1.4 * level);
  const flow = state.flow;

  const px = BACKGROUND.slice();
  const scale = SIZE * (1 + 0.018 * restingBeat(state.time) + 0.07 * level);
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + 3 * Math.sin(state.time * 0.9);
  const brightness = 1.5 + 0.9 * level;
  const haloStrength = 0.4 + 0.7 * level;
  const haloFalloff = 20 + 18 * level;

  // Where each light is this frame.
  const lights = LIGHTS.map(l => ({
    color: l.color,
    x: l.hx + l.ax * Math.sin(flow * l.fx * 2 + l.px),
    y: l.hy + l.ay * Math.sin(flow * l.fy * 2 + l.py),
    inv: 1 / (2.6 * l.r * l.r),
  }));

  const top = cy - (1.11 - MID) * scale, bottom = cy + MID * scale;
  const x0 = Math.max(0, Math.floor(cx - 0.61 * scale - HALO_REACH)), x1 = Math.min(WIDTH, Math.ceil(cx + 0.61 * scale + HALO_REACH));
  const y0 = Math.max(0, Math.floor(top - HALO_REACH)), y1 = Math.min(HEIGHT, Math.ceil(bottom + HALO_REACH));
  const rimWidth = 0.05 * scale;
  // The silky bands are sin(a(u) + b(v)); splitting the sum lets each row and column be computed once.
  const colSin = new Float32Array(x1 - x0), colCos = new Float32Array(x1 - x0);
  for (let x = x0; x < x1; x++) {
    const a = 5.5 * (x - cx) / scale;
    colSin[x - x0] = Math.sin(a);
    colCos[x - x0] = Math.cos(a);
  }

  for (let y = y0; y < y1; y++) {
    const v = MID - (y - cy) / scale;
    const rowPhase = 3.5 * v + 1.6 * flow + 1.4 * Math.sin(3 * v - 0.8 * flow);
    const rowSin = Math.sin(rowPhase), rowCos = Math.cos(rowPhase);
    for (let x = x0; x < x1; x++) {
      const u = (x - cx) / scale;
      const d = heart(u, v) * scale;
      if (d >= HALO_REACH) continue;
      const i = (y * WIDTH + x) * 4;

      // Light from each source, with slow silky bands running through it.
      const band = 0.75 + 0.35 * (colSin[x - x0] * rowCos + colCos[x - x0] * rowSin);
      let r = 0, g = 0, b = 0;
      for (const l of lights) {
        const k = bell(((u - l.x) ** 2 + (v - l.y) ** 2) * l.inv) * band;
        r += l.color[0] * k; g += l.color[1] * k; b += l.color[2] * k;
      }

      if (d > 0) {
        // Outside: a colored halo that hugs the heart and grows while talking.
        const f = 1 / (1 + d / haloFalloff);
        const a = haloStrength * f * f * (1 - d / HALO_REACH);
        px[i] += (255 - px[i]) * tone((1.5 * r + HALO_TINT[0]) * a);
        px[i + 1] += (255 - px[i + 1]) * tone((1.5 * g + HALO_TINT[1]) * a);
        px[i + 2] += (255 - px[i + 2]) * tone((1.5 * b + HALO_TINT[2]) * a);
        if (d >= 0.5) continue;
      }

      // Inside: dark glass lit from within, a bright rim at the edge, and a soft gloss on the left lobe.
      const rimT = 1 + Math.max(-d, 0) / rimWidth, rim = 1 / (rimT * rimT * rimT);
      const gloss = 0.28 * clamp01(1 - Math.hypot((u + 0.27) / 1.3, v - 0.86) / 0.13) ** 2;
      const lit = brightness * (1 - 0.3 * rim);
      const rimGlow = 0.35 * rim * (0.7 + 0.5 * level);
      const cr = tone(GLASS[0] + r * lit + (RIM[0] + 1.6 * r) * rimGlow) + gloss;
      const cg = tone(GLASS[1] + g * lit + (RIM[1] + 1.6 * g) * rimGlow) + gloss;
      const cb = tone(GLASS[2] + b * lit + (RIM[2] + 1.6 * b) * rimGlow) + gloss;
      const a = cover(d);
      px[i] += (255 * clamp01(cr) - px[i]) * a;
      px[i + 1] += (255 * clamp01(cg) - px[i + 1]) * a;
      px[i + 2] += (255 * clamp01(cb) - px[i + 2]) * a;
    }
  }
  return px;
}
