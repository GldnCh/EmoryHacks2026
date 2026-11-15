// Builds iCare's logo ("Family hearts", golden peach glass) and every icon size from one definition.
//   node scripts/make-icons.mjs
// Writes: public/icons/icare-mark.svg, icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png,
//         src/app/favicon.ico, docs/images/icare-devpost-thumbnail.png
// Original drawing (Cam, Emory Hacks 2026). Uses `sharp` (already installed by Next.js) to render the SVG.
import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

// Continuous-corner "squircle" (superellipse n = 5), like the iOS app icon mask, on a 100 x 100 canvas.
function squircle(n = 5) {
  const pts = [];
  for (let i = 0; i < 360; i += 2) {
    const t = (i * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    pts.push([50 + 50 * Math.sign(c) * Math.abs(c) ** (2 / n), 50 + 50 * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
}
export const SQUIRCLE = squircle();
export const BIG = "M42 76.5C19 62.4 10.5 49.6 10.5 37.6 10.5 27.2 18.3 19.5 28.2 19.5c6 0 10.8 2.9 13.8 7.7 3-4.8 7.8-7.7 13.8-7.7 9.9 0 17.7 7.7 17.7 18.1 0 12-8.5 24.8-31.5 38.9Z";
export const SMALL = "M67 83C54.3 75.4 49.6 68 49.6 61.2c0-5.8 4.2-10 9.7-10 3.4 0 6 1.6 7.7 4.3 1.7-2.7 4.3-4.3 7.7-4.3 5.5 0 9.7 4.2 9.7 10 0 6.8-4.7 14.2-17.4 21.8Z";

/** The mark as an SVG string. mask: squircle corners (false = full-bleed square). glyph: scale of the hearts. */
function markSvg({ size = 512, mask = true, glyph = 1 } = {}) {
  const t = 50 - 50 * glyph; // keep the hearts centered when scaled
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD98A"/><stop offset=".5" stop-color="#FFA960"/><stop offset="1" stop-color="#FF7C4E"/></linearGradient>
  <radialGradient id="light" cx=".22" cy=".12" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="big" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFF1E2"/></linearGradient>
  <linearGradient id="small" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A5C"/><stop offset="1" stop-color="#F2533F"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#fff" stop-opacity=".15"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="sq"><path d="${mask ? SQUIRCLE : "M0 0H100V100H0Z"}"/></clipPath>
  <clipPath id="bigc"><path d="${BIG}"/></clipPath>
  <clipPath id="smc"><path d="${SMALL}"/></clipPath>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.6" stdDeviation="3" flood-color="#8a3a14" flood-opacity=".22"/></filter>
</defs>
<g clip-path="url(#sq)">
  <rect width="100" height="100" fill="url(#bg)"/>
  <rect width="100" height="100" fill="url(#light)"/>
  <g transform="translate(${t + 3 * glyph} ${t}) scale(${glyph})">
    <g filter="url(#sh)"><path d="${BIG}" fill="url(#big)"/></g>
    <path d="${BIG}" fill="none" stroke="url(#rim)" stroke-width="2.4" clip-path="url(#bigc)"/>
    <g filter="url(#sh)"><path d="${SMALL}" fill="url(#small)" opacity=".9"/></g>
    <path d="${SMALL}" fill="none" stroke="url(#rim)" stroke-width="2" clip-path="url(#smc)"/>
  </g>
</g>
</svg>`;
}

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * (size / 100) * 1.5 }).resize(size, size).png().toBuffer();

/** .ico with PNG entries (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, buf }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e); header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(buf.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, ...images.map((x) => x.buf)]);
}

function thumbnailSvg() {
  const mark = markSvg({ size: 320 }).replace(/<svg [^>]*>/, "").replace("</svg>", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs>
  <linearGradient id="page" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF7EC"/><stop offset=".6" stop-color="#FFE6D2"/><stop offset="1" stop-color="#FFD3BC"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".36" r=".45"><stop offset="0" stop-color="#FFB877" stop-opacity=".40"/><stop offset="1" stop-color="#FFB877" stop-opacity="0"/></radialGradient>
  <filter id="blur" filterUnits="userSpaceOnUse" x="0" y="0" width="1200" height="800"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<rect width="1200" height="800" fill="url(#page)"/>
<rect width="1200" height="800" fill="url(#glow)"/>
<g filter="url(#blur)" opacity=".30"><path d="${SQUIRCLE}" transform="translate(440 118) scale(3.2)" fill="#B4511F"/></g>
<g transform="translate(440 100) scale(3.2)">${mark}</g>
<text x="600" y="555" text-anchor="middle" font-family="Segoe UI, SF Pro Rounded, Helvetica, Arial, sans-serif" font-size="92" font-weight="700" fill="#3B2418">iCare</text>
<text x="600" y="620" text-anchor="middle" font-family="Segoe UI, SF Pro Text, Helvetica, Arial, sans-serif" font-size="38" fill="#7A5240">Your family's health, explained.</text>
</svg>`;
}

await mkdir("public/icons", { recursive: true });
await mkdir("docs/images", { recursive: true });
await writeFile("public/icons/icare-mark.svg", markSvg({ size: 512 }));
await writeFile("public/icons/icon-192.png", await png(markSvg({ size: 192 }), 192));
await writeFile("public/icons/icon-512.png", await png(markSvg({ size: 512 }), 512));
// Android crops "maskable" icons to its own shape: full-bleed background, hearts inside the safe zone.
await writeFile("public/icons/maskable-512.png", await png(markSvg({ size: 512, mask: false, glyph: 0.72 }), 512));
// iOS rounds the corners itself and wants a full-bleed square.
await writeFile("public/icons/apple-touch-icon.png", await png(markSvg({ size: 180, mask: false }), 180));
const favicon = await Promise.all([16, 32, 48].map(async (size) => ({ size, buf: await png(markSvg({ size }), size) })));
await writeFile("src/app/favicon.ico", ico(favicon));
await writeFile("docs/images/icare-devpost-thumbnail.png", await sharp(Buffer.from(thumbnailSvg())).png().toBuffer());
console.log("✓ Logo, app icons, favicon and Devpost thumbnail written");
