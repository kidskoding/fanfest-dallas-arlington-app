// Deploy guard: refuse to ship a dev-configured web bundle to the LIVE event URL.
//
// The live build must be pinned to prod via `EXPO_PUBLIC_ENV=prod npx expo export`.
// That pin makes the bundle prod regardless of __DEV__ (the 'prod' override wins),
// so the strongest, most reliable check is to assert the pin is present. As a
// second line of defense we sanity-check the emitted bundle does not look like an
// unminified dev build (`expo export --dev`).
//
// Run this in CI between the export and the live deploy. It is intentionally NOT a
// firebase.json predeploy hook, because PR-preview builds are pinned to dev on
// purpose and must not trip this guard.
const fs = require('node:fs');
const path = require('node:path');

function fail(msg) {
  console.error(`\n✖ assert-prod-bundle: ${msg}\n`);
  process.exit(1);
}

// 1) The pin must be exactly 'prod'.
const pin = String(process.env.EXPO_PUBLIC_ENV || '').toLowerCase().trim();
if (pin !== 'prod') {
  fail(
    `EXPO_PUBLIC_ENV must be "prod" for a live deploy (got "${process.env.EXPO_PUBLIC_ENV ?? '<unset>'}").\n` +
      `  Run: EXPO_PUBLIC_ENV=prod npx expo export --platform web`
  );
}

// 2) Sanity-check the built bundle exists and is a minified (production) export.
const jsDir = path.join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'web');
let files = [];
try {
  files = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js'));
} catch (e) {
  fail(`no built bundle found at ${jsDir} — run the export first.`);
}
if (files.length === 0) fail(`no .js bundle in ${jsDir} — run the export first.`);

// `resolveEnv` is the source identifier; a minified prod bundle inlines/renames it
// away, while an unminified `--dev` bundle keeps it. Its presence flags a dev build.
const main = files.map((f) => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
if (main.includes('function resolveEnv')) {
  fail('bundle looks like an unminified dev build (`expo export --dev`). Refusing to deploy to live.');
}

console.log('✓ assert-prod-bundle: build is prod-pinned and minified — safe to deploy to live.');
