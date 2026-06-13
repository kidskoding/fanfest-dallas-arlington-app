# FanFest Signup MVP — Design

**Date:** 2026-06-13
**Status:** Approved
**Build budget:** ~2 hours

## Problem

FIFA World Cup 2026 FanFest needs an app that draws fans together. The
constraint is a 2-hour MVP that must work at a large, busy event. We solve it
with one viral loop instead of a feature pile.

## Core loop

Fan signs up → gets a ranked position with giveaway framing → redirected to the
WhatsApp community. Data collection is a side effect of the form.

This single loop hits all four product pillars:

- **Giveaway** — 100 prizes, first 100 signups win.
- **Exclusivity** — your position / odds ("You're #N").
- **Community** — WhatsApp redirect that outlives the booth.
- **Data** — name, country, team, connect-intent captured on submit.

## Architecture

Reuse the existing stack with zero new infrastructure:

- **Frontend:** Expo (managed, web target), single screen. Expo SDK 56.
- **Backend:** Firebase Firestore, anonymous (no auth), same as current scaffold.
- **Hosting:** Firebase Hosting (already deployed).

Replace the current `messages` realtime-feed screen in `App.js` with the signup
flow. Keep `firebaseConfig.js` as-is.

## Screen — single screen, three states

1. **Form state**
   - Name (text, required)
   - Country (dropdown, 48 qualified nations, required)
   - Favorite team (dropdown, same nation list, required)
   - Who you want to connect with (free text, optional)
   - Submit button
2. **Result state** (after submit)
   - "You're #N. First 100 win. The earlier you sign up, the better your odds."
   - Shows the real position returned from the write.
3. **Redirect state** (same screen, below result)
   - Prominent button: "Join the FanFest WhatsApp" → opens the single master
     group invite link in a new tab / external app.

States are sequential in one component: form → (submit) → result + redirect
shown together.

## Data model

Collection `signups`, one doc per fan:

```
{
  name: string,            // required, 1..100 chars
  country: string,         // required, from nation list
  team: string,            // required, from nation list
  connectIntent: string,   // optional, 0..280 chars
  position: number,        // assigned atomically, 1-based
  createdAt: serverTimestamp
}
```

Counter doc `counters/signups`:

```
{ count: number }
```

### Position assignment

`position` must be real and race-safe under booth-rate concurrent signups. Use a
Firestore transaction:

1. Read `counters/signups.count` (default 0 if missing).
2. `position = count + 1`.
3. Write the new `signups` doc with `position`.
4. Update `counters/signups.count = position`.

All in one `runTransaction` so two simultaneous signups never collide on a
number.

## Giveaway logic

Pure display. Positions 1–100 are winners; this is shown as framing only. No
lottery, no prize state machine, no fulfillment in the app — prizes are handled
offline at the booth. Honest and backend-free.

## Nation list

Hardcode a single array of nation names (used for both Country and Favorite team
dropdowns). Cleaner data than free text and enables the future "top 5 teams"
idea. Exact list of 48 names finalized at implementation time.

## Firestore rules

Extend current rules to cover the new collections, staying public/no-auth for
MVP, with shape + size validation to limit abuse:

- `signups`: `create` allowed if fields match types and length bounds; `read`
  denied (position is returned client-side from the transaction, no read needed);
  `update`/`delete` denied.
- `counters/signups`: `read` + `update` allowed (transaction needs both); no
  delete. Note: public update is an accepted MVP risk — a malicious user could
  inflate the counter. Acceptable for a 2-hour event MVP; hardening is parked.

## Out of scope (parked, intentionally)

Surveys / "what's FanFest missing", virtual pin exchange & tagging, final-score
predictions, restaurant deals, per-team or per-region WhatsApp groups, waitlist
/ approval tiers (Luma-style Type 1 / Type 2), multi-language translation,
automated WhatsApp intro messages, real auth + App Check hardening.

## Risks / accepted tradeoffs

- **Public counter write** — abuse possible; accepted for event window.
- **No dedupe** — one device can sign up many times; accepted for MVP.
- **Master group scale** — a single WhatsApp group for all 48 nations may get
  noisy; accepted, per-team routing is parked.

## Success criteria

A fan can, on event wifi, open the URL, fill the form, submit, see a real
position number with giveaway framing, and tap through to the WhatsApp group —
with their data landing in Firestore.
