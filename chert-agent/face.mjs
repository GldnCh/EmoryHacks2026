// The picture the caller sees: one RGBA frame per call to drawFace. Owner: Ish.
// Started from Chert's starter face; redrawn as iCare's check-in companion: a friendly heart that beats
// gently while listening and pulses bigger, with a glow, while it talks.
// Plain JavaScript with no dependencies. Shapes are signed distance fields with 1-pixel edge blending, so
// edges stay smooth. The heart always moves a little (heartbeat, glances, blinks), which also makes a frozen
// video easy to spot.
export const WIDTH = 640;
export const HEIGHT = 360;
export const FPS = 15;

const BG_TOP = [226, 242, 241]; // the app's --brand-soft
const BG_BOTTOM = [196, 228, 225];
const HEART_TOP = [255, 112, 136];
const HEART_BOTTOM = [222, 52, 86];
const GLOW = [255, 120, 145];
const INK = [70, 14, 32];
const WHITE = [255, 255, 255];
const CHEEK = [255, 178, 192];

// Heart size in pixels: the heart is about 1.1 of these units tall and 1.2 wide.
const SIZE = 240;
// Heart units (y up) are shifted so the heart's middle sits on the frame's center point.
const MID = 0.55;
const GLOW_REACH = 28;

// The background never changes, so it is drawn once and copied into every frame.
const BACKGROUND = (() => {
  const px = new Uint8Array(WIDTH * HEIGHT * 4);
  const cx = WIDTH / 2, cy = HEIGHT / 2;
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / (HEIGHT - 1);
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      // A soft white glow behind the heart.
      const glow = 0.55 * Math.max(0, 1 - Math.hypot(x - cx, y - cy) / (SIZE * 1.4)) ** 2;
      for (let c = 0; c < 3; c++) {
        const base = BG_TOP[c] + (BG_BOTTOM[c] - BG_TOP[c]) * t;
        px[i + c] = base + (WHITE[c] - base) * glow;
      }
      px[i + 3] = 255;
    }
  }
  return px;
})();

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Edge coverage for a signed distance: 1 inside, 0 outside, blended across one pixel. */
const cover = d => clamp01(0.5 - d);

function blend(px, i, r, g, b, alpha) {
  if (alpha <= 0) return;
  px[i] += (r - px[i]) * alpha;
  px[i + 1] += (g - px[i + 1]) * alpha;
  px[i + 2] += (b - px[i + 2]) * alpha;
}
const paint = (px, i, color, alpha) => blend(px, i, color[0], color[1], color[2], alpha);

/** Approximate signed distance to an axis-aligned ellipse. */
function ellipse(x, y, cx, cy, rx, ry) {
  return (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
}

/** Signed distance to a stroked circular arc with round ends, between angles a0 < a1 (radians, y pointing down). */
function arc(x, y, cx, cy, r, a0, a1, width) {
  let a = Math.atan2(y - cy, x - cx);
  if (a < a0 - Math.PI) a += 2 * Math.PI;
  if (a >= a0 && a <= a1) return Math.abs(Math.hypot(x - cx, y - cy) - r) - width / 2;
  const d0 = Math.hypot(x - (cx + r * Math.cos(a0)), y - (cy + r * Math.sin(a0)));
  const d1 = Math.hypot(x - (cx + r * Math.cos(a1)), y - (cy + r * Math.sin(a1)));
  return Math.min(d0, d1) - width / 2;
}

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

/** How open the eyes are (0 to 1): a blink every few seconds at uneven times, with an occasional double blink. */
export function eyeOpenness(tick) {
  const single = tick % 97;
  const double = (tick % 291) - 9;
  const phase = single < 3 ? single : double >= 0 && double < 3 ? double : -1;
  if (phase < 0) return 1;
  return phase === 1 ? 0.08 : 0.4;
}

/** A calm resting heartbeat (0 to 1): a "lub" then a softer "dub" about 64 times a minute. */
export function heartbeat(tick) {
  const p = tick % 14;
  return Math.exp(-(((p - 1) / 0.9) ** 2)) + 0.6 * Math.exp(-(((p - 4) / 0.9) ** 2));
}

/** How strongly the heart pulses with speech (0 to 1), in an uneven rhythm like syllables. */
export function talkPulse(tick, speaking) {
  if (!speaking) return 0;
  return 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.75)) * (0.6 + 0.4 * Math.abs(Math.sin(tick * 0.23)));
}

/**
 * iCare's friendly heart. `tick` counts frames; `speaking` is true while the agent talks.
 * Returns WIDTH x HEIGHT pixels, four bytes each: red, green, blue, alpha.
 */
export function drawFace(tick, speaking) {
  const px = BACKGROUND.slice();

  const beat = heartbeat(tick);
  const talk = talkPulse(tick, speaking);
  const scale = SIZE * (1 + 0.035 * beat + 0.09 * talk);
  // A gentle float, and slow glances to the side now and then.
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 + 2 * Math.sin(tick * 0.11);
  const look = 4 * Math.sin(tick * 0.043) * (Math.sin(tick * 0.017) > 0.3 ? 1 : 0.25);
  const open = eyeOpenness(tick);
  // The glow around the heart: faint with each resting beat, stronger while talking.
  const glowStrength = 0.12 * beat + 0.55 * talk;

  const top = cy - (1.11 - MID) * scale, bottom = cy + MID * scale;
  const eyeY = cy - 0.07 * scale, eyeDx = 0.2 * scale, eyeRx = 0.05 * scale, eyeRy = 0.072 * scale;
  const cheekY = cy + 0.05 * scale, cheekDx = 0.31 * scale, cheekR = 0.065 * scale;
  const smileY = cy - 0.02 * scale, smileR = 0.07 * scale;

  // Only pixels near the heart change; the rest stays background. The margin leaves room for glow and shadow.
  const x0 = Math.max(0, Math.floor(cx - 0.61 * scale - GLOW_REACH)), x1 = Math.min(WIDTH, Math.ceil(cx + 0.61 * scale + GLOW_REACH));
  const y0 = Math.max(0, Math.floor(top - GLOW_REACH)), y1 = Math.min(HEIGHT, Math.ceil(bottom + GLOW_REACH));
  // Features are only evaluated inside their own bands, which keeps a frame well within the 15 FPS budget.
  const eyeTop = eyeY - eyeRy - 2, eyeBottom = eyeY + eyeRy + 2;
  const cheekTop = cheekY - 2 * cheekR, cheekBottom = cheekY + 2 * cheekR;
  const smileTop = smileY, smileBottom = smileY + smileR + 6;

  for (let y = y0; y < y1; y++) {
    const t = clamp01((y - top) / (bottom - top));
    const hr = HEART_TOP[0] + (HEART_BOTTOM[0] - HEART_TOP[0]) * t;
    const hg = HEART_TOP[1] + (HEART_BOTTOM[1] - HEART_TOP[1]) * t;
    const hb = HEART_TOP[2] + (HEART_BOTTOM[2] - HEART_TOP[2]) * t;
    const hy = MID - (y - cy) / scale;
    for (let x = x0; x < x1; x++) {
      const i = (y * WIDTH + x) * 4;
      const d = heart((x - cx) / scale, hy) * scale;

      if (d > 0) {
        // Outside the heart: a soft shadow below it and the pulsing glow around it.
        const shadow = heart((x - cx) / scale, hy + 10 / scale) * scale;
        paint(px, i, INK, 0.1 * clamp01(1 - (shadow + 2) / 14));
        if (glowStrength > 0 && d < GLOW_REACH) paint(px, i, GLOW, glowStrength * (1 - d / GLOW_REACH) ** 2);
        if (d >= 0.5) continue;
      }

      const heartA = cover(d);
      blend(px, i, hr, hg, hb, heartA);
      // A glossy highlight on the left lobe, so the heart looks plump rather than flat.
      paint(px, i, WHITE, heartA * 0.4 * clamp01(1 - Math.hypot(x - (cx - 0.3 * scale), y - (cy - 0.27 * scale)) / (0.11 * scale)) ** 2);

      const nearEyes = y >= eyeTop && y <= eyeBottom && Math.abs(Math.abs(x - cx - look) - eyeDx) < eyeRx + 4;
      const nearCheeks = y >= cheekTop && y <= cheekBottom && Math.abs(Math.abs(x - cx) - cheekDx) < 2 * cheekR;
      for (const side of [-1, 1]) {
        if (nearCheeks) {
          // Rosy cheeks.
          const cheek = Math.hypot((x - (cx + side * cheekDx)) / 1.3, y - cheekY);
          paint(px, i, CHEEK, heartA * 0.8 * clamp01(1.4 - cheek / cheekR) ** 1.2);
        }
        if (!nearEyes) continue;

        // Eyes: tall ovals with two sparkles each. Mid-blink they become a soft curved line.
        const ex = cx + side * eyeDx + look;
        if (open < 0.2) {
          paint(px, i, INK, cover(arc(x, y, ex, eyeY - 6, eyeRx + 1, 0.35, Math.PI - 0.35, 4.5)));
          continue;
        }
        paint(px, i, INK, cover(ellipse(x, y, ex, eyeY, eyeRx, eyeRy * open)));
        if (open > 0.5) {
          paint(px, i, WHITE, cover(Math.hypot(x - (ex - 3.5), y - (eyeY - 6)) - 4.5));
          paint(px, i, WHITE, 0.85 * cover(Math.hypot(x - (ex + 4), y - (eyeY + 5)) - 2));
        }
      }

      // A small, warm smile. The heart's pulse does the talking.
      if (y >= smileTop && y <= smileBottom && Math.abs(x - cx) <= smileR + 4) {
        paint(px, i, INK, cover(arc(x, y, cx, smileY, smileR, 0.45, Math.PI - 0.45, 5)));
      }
    }
  }
  return px;
}
