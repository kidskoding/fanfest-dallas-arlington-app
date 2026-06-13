# FanFest App — Agent Guide

> **Expo HAS CHANGED.** Read the exact versioned docs at
> https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## What this is

A one-screen signup app for a FIFA World Cup 2026 FanFest event. Fans pick their
country, the team they support, and what they're looking for, then submit. Each
signup gets a 1-based join rank ("you're fan #N") with the first 100 framed as
winners. Built with Expo SDK 56 and deployed to the web via Firebase Hosting.
The primary target is **web** (`react-native-web`); iOS/Android run from the same
codebase but are not the deploy target.

## Stack

- **Expo SDK ~56.0** / React Native 0.85.3 / React 19.2.3
- **react-native-web** ~0.21 — web is the shipping platform (`web.output: single`)
- **Firebase JS SDK ^12** — Firestore for signups + live counter (no native config)
- **Firebase Hosting** — serves the static Expo web export from `dist/`
- Single-file UI in `App.js`; logic split into pure, testable modules under `src/`

## Layout

```
App.js                 Single-screen UI (form, live ticker, rank reveal, animations)
index.js               registerRootComponent(App)
firebaseConfig.js      Firebase web init -> exports { auth, db }. apiKey is PUBLIC by design.
firestore.rules        Security rules (deployed via firebase deploy)
firebase.json          Hosting (public: dist) + firestore rules config
.firebaserc            Default project: fanfest-app
.env                   EXPO_PUBLIC_* only (public values: WhatsApp invite, ticker seed)

src/
  signup.js            submitSignup() transaction + subscribeToCount() listener
  position.js          nextPosition(count) — pure 1-based rank arithmetic
  env.js               Resolved env (wires __DEV__ / EXPO_PUBLIC_ENV into envCore)
  envCore.js           Pure dev/prod resolver -> { isDev, label, suffix }
  nations.js           48 World Cup 2026 nations (A–Z)
  flags.js             Flag emoji per nation + flagFor()
  lookingTypes.js      Signup "looking for" options
  share.js / shareText.js   Share-your-rank text + share sheet
  celebrate.js         buzz() haptics + playWinSound() on submit

scripts/               QR generation/verification + node test scripts + prod-bundle assert
docs/superpowers/      specs/ and plans/ for the signup MVP
.github/workflows/     firebase-deploy.yml (push->main, live) + firebase-pr-preview.yml
```

## Dev vs prod — the suffix system (IMPORTANT)

Collection names are namespaced so local testing never touches real event data:

- `expo start` → `__DEV__` true → **dev** → suffix `_dev` → writes `signups_dev` / `counters/signups_dev`
- `expo export` build → `__DEV__` false → **prod** → suffix `''` → writes `signups` / `counters/signups`
- `EXPO_PUBLIC_ENV=dev|prod` **forces** either, overriding `__DEV__`.

`envCore.resolveEnv` is pure (node-testable); `env.js` wires in the platform globals.
The CI deploy pins `EXPO_PUBLIC_ENV=prod` and runs `scripts/assert-prod-bundle.js`
to refuse shipping a dev-namespaced bundle to the live site.

## Firestore data model & rules

- `signups{suffix}/{id}` — one doc per fan: `{ name, country, team, lookingType, lookingGoal, position }`.
  Rules validate shape/size on create; **prod `signups` is create-only, no read/update/delete**.
  Dev `signups_dev` allows read+delete (easy to inspect/wipe), create-validated.
- `counters/signups{suffix}` — `{ count: int >= 0 }`. Public read; create/update validated.
  `submitSignup` runs a Firestore **transaction**: read counter → `nextPosition` → write
  signup with that position → increment counter. `subscribeToCount` is a live `onSnapshot`.
- MVP accepts public/no-auth writes (counter inflation is a known, parked risk).
  Hardening path: Anonymous Auth + App Check.

## Commands

```bash
npm start              # expo start (dev, _dev collections)
npm run web            # expo start --web
npm run ios / android  # native from same codebase
npm run qr             # scripts/gen-qr.mjs  — generate event QR
npm run qr:verify      # scripts/verify-qr.mjs

npx expo export -p web                         # build static web -> dist/
EXPO_PUBLIC_ENV=prod npx expo export -p web    # prod-pinned build (what CI ships)
firebase deploy                                # deploy hosting + firestore rules
```

## CI/CD

- **firebase-deploy.yml** — on push to `main` (or manual): `npm ci` → prod web export →
  assert-prod-bundle → deploy to Firebase Hosting `live` channel. Needs repo secret
  `FIREBASE_SERVICE_ACCOUNT`.
- **firebase-pr-preview.yml** — preview channel per PR.

## Conventions

- Keep arithmetic/env/data logic in pure `src/` modules (no Firestore/platform imports)
  so the `scripts/test-*.js` node tests stay runnable. UI/side-effects live in `App.js`.
- `.env` is for **public** `EXPO_PUBLIC_*` values only — never put secrets there; they
  are bundled into the client. Real secrets stay out of git.
- `dist/`, `.expo/`, `.firebase/`, `node_modules/` are build/cache — gitignored.

## Git / GitHub

- Remote: private `kidskoding/fanfest-app` (`origin`, ssh).
- Default branch `main` is protected by review — **do not push directly to `main`**.
  Branch + PR; squash-merge.
