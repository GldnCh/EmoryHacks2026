// The picture the caller sees: one RGBA frame per call to drawFace. Owner: Ish.
// Started from Chert's starter face; redrawn as iCare's friendly check-in companion in the app's teal.
// Plain JavaScript with no dependencies. Shapes are signed distance fields with 1-pixel edge blending, so
// edges stay smooth. The face always moves a little (breathing, glances, blinks), which also makes a frozen
// video easy to spot.
export const WIDTH = 640;
export const HEIGHT = 360;
export const FPS = 15;

const BG_TOP = [226, 242, 241]; // the app's --brand-soft
const BG_BOTTOM = [196, 228, 225];
const FACE_TOP = [72, 196, 186];
const FACE_BOTTOM = [32, 160, 154];
const INK = [18, 58, 60];
const WHITE = [255, 255, 255];
const CHEEK = [255, 170, 170];
const TONGUE = [255, 120, 125];

const RADIUS = HEIGHT * 0.36;

// The background never changes, so it is drawn once and copied into every frame.
const BACKGROUND = (() => {
  const px = new Uint8Array(WIDTH * HEIGHT * 4);
  const cx = WIDTH / 2, cy = HEIGHT / 2 - 6;
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / (HEIGHT - 1);
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      // A soft white glow behind the face.
      const glow = 0.55 * Math.max(0, 1 - Math.hypot(x - cx, y - cy) / (RADIUS * 1.9)) ** 2;
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

/** How open the eyes are (0 to 1): a blink every few seconds at uneven times, with an occasional double blink. */
export function eyeOpenness(tick) {
  const single = tick % 97;
  const double = (tick % 291) - 9;
  const phase = single < 3 ? single : double >= 0 && double < 3 ? double : -1;
  if (phase < 0) return 1;
  return phase === 1 ? 0.08 : 0.4;
}

/**
 * iCare's friendly face. `tick` counts frames; `speaking` is true while the agent talks.
 * Returns WIDTH x HEIGHT pixels, four bytes each: red, green, blue, alpha.
 */
export function drawFace(tick, speaking) {
  const px = BACKGROUND.slice();

  // A gentle breathing bob, and slow glances to the side now and then.
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 - 8 + 3 * Math.sin(tick * 0.11);
  const look = 4 * Math.sin(tick * 0.043) * (Math.sin(tick * 0.017) > 0.3 ? 1 : 0.25);
  const open = eyeOpenness(tick);

  const eyeY = cy - 28, eyeDx = 50, eyeRx = 13, eyeRy = 18;
  const browLift = speaking ? 3 * Math.abs(Math.sin(tick * 0.35)) : 0;
  const mouthY = cy + 40;
  const talk = speaking ? 0.35 + 0.65 * Math.abs(Math.sin(tick * 0.75)) * (0.6 + 0.4 * Math.abs(Math.sin(tick * 0.23))) : 0;
  const mouthRx = 40 + 4 * talk, mouthRy = 6 + 20 * talk;

  // Only pixels near the face change; the rest stays background. The margin leaves room for the shadow.
  const x0 = Math.floor(cx - RADIUS - 16), x1 = Math.ceil(cx + RADIUS + 16);
  const y0 = Math.max(0, Math.floor(cy - RADIUS - 16)), y1 = Math.min(HEIGHT, Math.ceil(cy + RADIUS + 26));
  // Features are only evaluated inside their own bands, which keeps a frame well within the 15 FPS budget.
  const featureTop = eyeY - 36, eyeBottom = eyeY + eyeRy + 2, cheekTop = cy - 6, cheekBottom = cy + 42;
  const mouthTop = mouthY - 14, mouthBottom = mouthY + mouthRy + 8;

  for (let y = y0; y < y1; y++) {
    const t = clamp01((y - (cy - RADIUS)) / (2 * RADIUS));
    const fr = FACE_TOP[0] + (FACE_BOTTOM[0] - FACE_TOP[0]) * t;
    const fg = FACE_TOP[1] + (FACE_BOTTOM[1] - FACE_TOP[1]) * t;
    const fb = FACE_TOP[2] + (FACE_BOTTOM[2] - FACE_TOP[2]) * t;
    for (let x = x0; x < x1; x++) {
      const i = (y * WIDTH + x) * 4;

      // A soft shadow under the face.
      const shadow = Math.hypot(x - cx, y - (cy + 10)) - RADIUS;
      paint(px, i, INK, 0.12 * clamp01(1 - (shadow + 2) / 14));

      const faceA = cover(Math.hypot(x - cx, y - cy) - RADIUS);
      if (faceA <= 0) continue;
      blend(px, i, fr, fg, fb, faceA);
      // A soft highlight on the upper left, so the face looks round rather than flat.
      paint(px, i, WHITE, faceA * 0.22 * clamp01(1 - Math.hypot(x - (cx - 45), y - (cy - 60)) / 70));

      const nearEyes = y >= featureTop && y <= eyeBottom && Math.abs(Math.abs(x - cx) - eyeDx) < 34;
      const nearCheeks = y >= cheekTop && y <= cheekBottom && Math.abs(Math.abs(x - cx) - 78) < 30;
      for (const side of [-1, 1]) {
        if (nearCheeks) {
          // Rosy cheeks.
          const cheek = Math.hypot((x - (cx + side * 78)) / 1.3, y - (cy + 18));
          paint(px, i, CHEEK, faceA * 0.75 * clamp01(1.4 - cheek / 16) ** 1.2);
        }
        if (!nearEyes) continue;

        // Eyebrows: short, relaxed arcs that lift a little while talking.
        const bx = cx + side * eyeDx, by = eyeY + 10 - browLift;
        paint(px, i, INK, faceA * 0.85 * cover(arc(x, y, bx, by, 40, -Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3, 5)));

        // Eyes: tall ovals with two sparkles each. Mid-blink they become a soft curved line.
        const ex = cx + side * eyeDx + look;
        if (open < 0.2) {
          paint(px, i, INK, cover(arc(x, y, ex, eyeY - 6, 13, 0.35, Math.PI - 0.35, 5)));
          continue;
        }
        paint(px, i, INK, cover(ellipse(x, y, ex, eyeY, eyeRx, eyeRy * open)));
        if (open > 0.5) {
          paint(px, i, WHITE, cover(Math.hypot(x - (ex - 4), y - (eyeY - 7)) - 5));
          paint(px, i, WHITE, 0.85 * cover(Math.hypot(x - (ex + 5), y - (eyeY + 6)) - 2.2));
        }
      }

      // Mouth: a warm smile while listening, a happy open smile while talking.
      if (y < mouthTop || y > mouthBottom || Math.abs(x - cx) > mouthRx + 8) continue;
      if (talk === 0) {
        paint(px, i, INK, cover(arc(x, y, cx, mouthY - 34, 44, 0.55, Math.PI - 0.55, 6)));
      } else {
        // The top edge curls up at the corners; the bottom is round.
        const top = mouthY - 4 - 0.004 * (x - cx) ** 2;
        const mouth = Math.max(ellipse(x, y, cx, mouthY - 4, mouthRx, mouthRy + 4), top - y);
        paint(px, i, INK, cover(mouth));
        const tongue = Math.max(mouth + 1, ellipse(x, y, cx, mouthY + mouthRy * 0.85, mouthRx * 0.5, mouthRy * 0.45));
        paint(px, i, TONGUE, cover(tongue));
      }
    }
  }
  return px;
}
