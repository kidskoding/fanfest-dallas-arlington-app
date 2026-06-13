// Generate branded QR SVGs: dark-emerald modules with a clean soccer-ball mark
// centered. High error-correction (H, ~30%) keeps them scannable despite the
// logo. Run: node scripts/gen-qr.mjs  (then rsvg-convert for PNGs).
import QRCode from 'qrcode';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'qr');

const DARK = '#065F46'; // emerald-800 — branded but high-contrast for scanning
const INK = '#0A0A0A';
const WHITE = '#FFFFFF';
const MARGIN = 4; // quiet zone in modules
const CELL = 16; // px per module

const TARGETS = [
  { name: 'fanfest-app-branded', url: 'https://fanfest-app.web.app' },
  {
    name: 'fanfest-whatsapp-branded',
    url: 'https://chat.whatsapp.com/BISNF81vhL63Krh6WEbB0q?s=cl&p=i&ilr=0',
  },
];

// Minimalist soccer ball: white disc, central pentagon, 5 spokes to the rim.
function soccerBall(cx, cy, R) {
  const rp = R * 0.46;
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const a = ((-90 + k * 72) * Math.PI) / 180;
    pts.push([cx + rp * Math.cos(a), cy + rp * Math.sin(a)]);
  }
  const pent = pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  let spokes = '';
  for (const [x, y] of pts) {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy);
    const ex = cx + (dx / len) * R * 0.9;
    const ey = cy + (dy / len) * R * 0.9;
    spokes += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(
      1
    )}" stroke="${INK}" stroke-width="${(R * 0.07).toFixed(1)}" stroke-linecap="round"/>`;
  }
  return (
    `<circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${WHITE}" stroke="${INK}" stroke-width="${(
      R * 0.08
    ).toFixed(1)}"/>` +
    spokes +
    `<polygon points="${pent}" fill="${INK}"/>`
  );
}

for (const { name, url } of TARGETS) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const dim = (n + MARGIN * 2) * CELL;

  let rects = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (data[y * n + x]) {
        rects += `<rect x="${(x + MARGIN) * CELL}" y="${(y + MARGIN) * CELL}" width="${CELL}" height="${CELL}"/>`;
      }
    }
  }

  const cx = dim / 2;
  const cy = dim / 2;
  const R = dim * 0.1; // logo radius -> ~20% diameter, safe under ECC H
  const clear = R * 1.28; // white knockout so modules don't fight the logo

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}">` +
    `<rect width="${dim}" height="${dim}" fill="${WHITE}"/>` +
    `<g fill="${DARK}">${rects}</g>` +
    `<circle cx="${cx}" cy="${cy}" r="${clear.toFixed(1)}" fill="${WHITE}"/>` +
    soccerBall(cx, cy, R) +
    `</svg>`;

  const svgFile = join(OUT, `${name}.svg`);
  writeFileSync(svgFile, svg);

  // Rasterize at an integer multiple of the native size so every module lands on
  // exact pixel boundaries — non-integer scaling softens edges and breaks decoding.
  const SCALE = 3;
  const pngFile = join(OUT, `${name}.png`);
  execSync(`rsvg-convert -w ${dim * SCALE} -h ${dim * SCALE} "${svgFile}" -o "${pngFile}"`);
  console.log(`wrote ${name}.svg + .png (${n}x${n} modules, ${dim * SCALE}px)`);
}
