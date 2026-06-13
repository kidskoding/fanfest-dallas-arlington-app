// Decode-verify the branded QR PNGs actually resolve to their intended URLs.
// Guards against a logo/scale change silently producing an unscannable code.
// Run: node scripts/verify-qr.mjs
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const QR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'qr');

const EXPECT = {
  'fanfest-app-branded': 'https://fanfest-app.web.app',
  'fanfest-whatsapp-branded': 'https://chat.whatsapp.com/BISNF81vhL63Krh6WEbB0q?s=cl&p=i&ilr=0',
};

let fail = 0;
for (const [name, url] of Object.entries(EXPECT)) {
  const png = PNG.sync.read(readFileSync(join(QR, `${name}.png`)));
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  const ok = res && res.data === url;
  console.log(`${ok ? '✓' : '✗'} ${name} (${png.width}px) -> ${res ? res.data : 'DECODE FAILED'}`);
  if (!ok) fail++;
}
console.log(fail === 0 ? 'PASS verify-qr' : `FAIL verify-qr (${fail})`);
process.exit(fail ? 1 : 0);
