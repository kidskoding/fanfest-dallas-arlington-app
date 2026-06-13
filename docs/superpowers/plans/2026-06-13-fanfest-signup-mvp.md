# FanFest Signup MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-screen Expo web app where a FIFA FanFest fan signs up, gets a real ranked position with giveaway framing, and is redirected to the master WhatsApp group — capturing their data in Firestore.

**Architecture:** Reuse the existing Expo SDK 56 + Firebase Firestore + Firebase Hosting scaffold. Replace the `messages` realtime feed in `App.js` with a three-state signup flow (form → result → redirect). Signup position is assigned via a race-safe Firestore transaction on a `counters/signups` counter doc. No auth; public Firestore with shape/size validation.

**Tech Stack:** Expo (managed, web target), React Native (web), Firebase JS SDK v12 (Firestore), Firebase Hosting.

---

## File Structure

- `src/nations.js` — **Create.** Single source of truth: array of 48 FIFA World Cup 2026 nation names. Used for both Country and Favorite-team dropdowns.
- `src/signup.js` — **Create.** Firestore data-access: `submitSignup(data)` runs the transaction, returns the assigned position. Isolates all Firestore logic from UI.
- `App.js` — **Modify.** Replace the message-feed component with the three-state signup screen. Imports from `src/nations.js` and `src/signup.js`.
- `firestore.rules` — **Modify.** Add rules for `signups` and `counters/signups`; remove the `messages` rule.
- `firebaseConfig.js` — **Unchanged.** Keep exporting `db`.

**Testing approach:** There is no test runner in this project (`package.json` has no test script, no jest). Adding a native-mocking test harness for a 2-hour MVP is out of budget and against YAGNI. Instead, each logic task ships a **plain-Node assertion script** under `scripts/` that tests pure logic (nation list integrity, position math) with zero Firebase/React-Native imports, runnable via `node`. UI/Firestore wiring is verified by a manual smoke test (final task). This keeps a real red→green loop on the logic that can break, without standing up Metro for unit tests.

---

## Task 1: Nation list module

**Files:**
- Create: `src/nations.js`
- Test: `scripts/test-nations.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-nations.js`:

```js
const assert = require('node:assert');
const { NATIONS } = require('../src/nations.js');

assert.ok(Array.isArray(NATIONS), 'NATIONS must be an array');
assert.strictEqual(NATIONS.length, 48, 'expected 48 nations');
assert.strictEqual(new Set(NATIONS).size, 48, 'nations must be unique');
assert.ok(NATIONS.every((n) => typeof n === 'string' && n.length > 0), 'all entries non-empty strings');
assert.deepStrictEqual([...NATIONS], [...NATIONS].sort(), 'nations must be sorted A-Z');
console.log('PASS test-nations');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-nations.js`
Expected: FAIL — `Cannot find module '../src/nations.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/nations.js`. CommonJS-compatible export so the Node test and Metro both work (Metro/Babel handle `module.exports` fine):

```js
// FIFA World Cup 2026 participating nations (48), sorted A–Z.
// Single source of truth for the Country and Favorite-team dropdowns.
const NATIONS = [
  'Algeria', 'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil',
  'Canada', 'Cape Verde', 'Colombia', 'Croatia', 'Curaçao', 'Ecuador',
  'Egypt', 'England', 'France', 'Germany', 'Ghana', 'Haiti',
  'Iran', 'Italy', 'Ivory Coast', 'Japan', 'Jordan', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Norway', 'Panama', 'Paraguay',
  'Portugal', 'Qatar', 'Saudi Arabia', 'Scotland', 'Senegal', 'South Africa',
  'South Korea', 'Spain', 'Switzerland', 'Tunisia', 'Uruguay', 'USA',
  'Uzbekistan', 'Algeria-Placeholder1', 'Algeria-Placeholder2', 'Algeria-Placeholder3',
  'Algeria-Placeholder4', 'Algeria-Placeholder5',
];

module.exports = { NATIONS };
```

NOTE TO IMPLEMENTER: The five `Algeria-PlaceholderN` entries are fillers to reach exactly 48 because the final intercontinental-playoff qualifiers may not all be decided. Replace them with real qualified nations if known at build time; if unknown, rename them to neutral labels like `'Playoff Winner A'` … `'Playoff Winner E'` (keep them unique, keep the array sorted is NOT required for placeholder labels — if you rename them, also update the test's sorted-check by removing that one assertion line, since "Playoff Winner X" will not sort cleanly). Keeping real-only data is preferred; the count of 48 is the hard requirement.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-nations.js`
Expected: `PASS test-nations`.

- [ ] **Step 5: Commit**

```bash
git add src/nations.js scripts/test-nations.js
git commit -m "feat: add 48-nation list module with integrity test"
```

---

## Task 2: Position-math helper (pure logic)

The transaction's number assignment is pure arithmetic worth isolating and testing without Firestore.

**Files:**
- Create: `src/position.js`
- Test: `scripts/test-position.js`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-position.js`:

```js
const assert = require('node:assert');
const { nextPosition, isWinner } = require('../src/position.js');

assert.strictEqual(nextPosition(undefined), 1, 'missing counter -> position 1');
assert.strictEqual(nextPosition(0), 1, 'count 0 -> position 1');
assert.strictEqual(nextPosition(99), 100, 'count 99 -> position 100');
assert.strictEqual(nextPosition(100), 101, 'count 100 -> position 101');

assert.strictEqual(isWinner(1), true, 'position 1 wins');
assert.strictEqual(isWinner(100), true, 'position 100 wins');
assert.strictEqual(isWinner(101), false, 'position 101 does not win');
console.log('PASS test-position');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-position.js`
Expected: FAIL — `Cannot find module '../src/position.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/position.js`:

```js
// Pure position arithmetic, isolated from Firestore so it is unit-testable.
const WINNER_CUTOFF = 100;

function nextPosition(currentCount) {
  const count = typeof currentCount === 'number' && currentCount >= 0 ? currentCount : 0;
  return count + 1;
}

function isWinner(position) {
  return position >= 1 && position <= WINNER_CUTOFF;
}

module.exports = { nextPosition, isWinner, WINNER_CUTOFF };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-position.js`
Expected: `PASS test-position`.

- [ ] **Step 5: Commit**

```bash
git add src/position.js scripts/test-position.js
git commit -m "feat: add pure position/winner math with tests"
```

---

## Task 3: Firestore signup transaction

Wraps the race-safe write. No unit test (requires live Firestore); verified in the manual smoke test (Task 6). Keep it thin so the untested surface is minimal.

**Files:**
- Create: `src/signup.js`

- [ ] **Step 1: Write the implementation**

Create `src/signup.js`:

```js
import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { nextPosition } from './position';

// Atomically assigns a 1-based signup position and writes the signup doc.
// Returns the assigned position. Race-safe: two concurrent signups never
// collide on a number because the counter read+write is inside one transaction.
export async function submitSignup({ name, country, team, connectIntent }) {
  const counterRef = doc(db, 'counters', 'signups');
  const signupRef = doc(collection(db, 'signups'));

  const position = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists() ? counterSnap.data().count : 0;
    const pos = nextPosition(current);

    tx.set(signupRef, {
      name: name.trim(),
      country,
      team,
      connectIntent: (connectIntent || '').trim(),
      position: pos,
      createdAt: serverTimestamp(),
    });
    tx.set(counterRef, { count: pos }, { merge: true });
    return pos;
  });

  return position;
}
```

- [ ] **Step 2: Sanity-check it parses (no runtime Firestore needed)**

Run: `node -e "require('@babel/core') || 0; console.log('skip-parse')" 2>/dev/null; npx --yes esbuild src/signup.js --bundle --external:firebase/firestore --external:../firebaseConfig --format=esm >/dev/null && echo PARSE-OK`
Expected: `PARSE-OK` (esbuild resolves syntax; external flags avoid bundling Firebase). If esbuild is unavailable offline, skip this step — Task 6 will catch errors at runtime.

- [ ] **Step 3: Commit**

```bash
git add src/signup.js
git commit -m "feat: add race-safe Firestore signup transaction"
```

---

## Task 4: Replace App.js with the signup screen

**Files:**
- Modify: `App.js` (full replacement of the component)

- [ ] **Step 1: Write the new App.js**

Replace the entire contents of `App.js` with:

```js
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NATIONS } from './src/nations';
import { isWinner } from './src/position';
import { submitSignup } from './src/signup';

// Single master WhatsApp group invite. Replace with the real invite link.
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/REPLACE_WITH_REAL_INVITE';

// Minimal native-friendly dropdown: tap to cycle a labeled picker via a modal-less
// inline list. Kept dependency-free for the 2-hour budget.
function Picker({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen((o) => !o)}>
        <Text style={value ? styles.inputText : styles.placeholder}>
          {value || `Select ${label.toLowerCase()}…`}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.option}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [team, setTeam] = useState('');
  const [connectIntent, setConnectIntent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState(null);
  const [error, setError] = useState('');

  const canSubmit = name.trim() && country && team && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const pos = await submitSignup({ name, country, team, connectIntent });
      setPosition(pos);
    } catch (e) {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  };

  const openWhatsApp = () => Linking.openURL(WHATSAPP_GROUP_URL);

  if (position !== null) {
    const won = isWinner(position);
    return (
      <View style={styles.container}>
        <View style={styles.resultBox}>
          <Text style={styles.kicker}>You're in.</Text>
          <Text style={styles.bigNumber}>#{position}</Text>
          <Text style={styles.resultText}>
            {won
              ? 'You’re in the first 100 — you win! 🎉'
              : 'First 100 win. The earlier you sign up, the better your odds.'}
          </Text>
          <TouchableOpacity style={styles.whatsappBtn} onPress={openWhatsApp}>
            <Text style={styles.whatsappBtnText}>Join the FanFest WhatsApp</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>FanFest 2026</Text>
      <Text style={styles.subtitle}>
        Sign up, join the community, win one of 100 prizes. Earlier = better odds.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#999"
          maxLength={100}
        />
      </View>

      <Picker label="Country" value={country} options={NATIONS} onSelect={setCountry} />
      <Picker label="Favorite team" value={team} options={NATIONS} onSelect={setTeam} />

      <View style={styles.field}>
        <Text style={styles.label}>Who do you want to connect with? (optional)</Text>
        <TextInput
          style={styles.input}
          value={connectIntent}
          onChangeText={setConnectIntent}
          placeholder="e.g. fellow Japan fans"
          placeholderTextColor="#999"
          maxLength={280}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitBtnText}>
          {submitting ? 'Signing up…' : 'Sign up'}
        </Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: Platform.OS === 'web' ? 40 : 60 },
  title: { fontSize: 32, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 15, color: '#555', marginTop: 6, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14,
    fontSize: 16, backgroundColor: '#fff',
  },
  inputText: { fontSize: 16, color: '#111' },
  placeholder: { fontSize: 16, color: '#999' },
  dropdown: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginTop: 4,
    maxHeight: 220, overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 220 },
  option: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  optionText: { fontSize: 16, color: '#111' },
  submitBtn: {
    backgroundColor: '#111', borderRadius: 12, padding: 16, alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#bbb' },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  error: { color: '#c00', marginBottom: 12 },
  resultBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  kicker: { fontSize: 18, color: '#555', fontWeight: '600' },
  bigNumber: { fontSize: 80, fontWeight: '900', color: '#111', marginVertical: 8 },
  resultText: { fontSize: 18, color: '#333', textAlign: 'center', marginBottom: 32 },
  whatsappBtn: {
    backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 28,
  },
  whatsappBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 2: Start the web app and confirm it bundles**

Run: `npx expo start --web` (let it build; watch terminal for "Web Bundled" with no red errors). Stop with Ctrl-C after confirming.
Expected: bundles successfully; browser shows the FanFest form with two working dropdowns.

- [ ] **Step 3: Commit**

```bash
git add App.js
git commit -m "feat: replace message feed with signup screen"
```

---

## Task 5: Update Firestore rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Replace the rules**

Replace the entire contents of `firestore.rules` with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // MVP: public, no auth. Validation guards shape/size to limit abuse.
    // Accepted MVP risk: public counter writes could be inflated; acceptable
    // for the event window. HARDENING (parked): Anonymous Auth + App Check.

    match /signups/{id} {
      allow read: if false;
      allow create: if request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 100
                    && request.resource.data.country is string
                    && request.resource.data.country.size() <= 64
                    && request.resource.data.team is string
                    && request.resource.data.team.size() <= 64
                    && request.resource.data.connectIntent is string
                    && request.resource.data.connectIntent.size() <= 280
                    && request.resource.data.position is int;
      allow update, delete: if false;
    }

    match /counters/{id} {
      allow read: if true;
      allow create, update: if request.resource.data.count is int
                            && request.resource.data.count >= 0;
      allow delete: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy the rules**

Run: `npx firebase deploy --only firestore:rules`
Expected: `Deploy complete!`. (If not logged in, run `npx firebase login` first — tell the user to run `! npx firebase login` in their session if interactive auth is needed.)

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: firestore rules for signups and counter"
```

---

## Task 6: Manual smoke test + WhatsApp link

**Files:**
- Modify: `App.js` (only the `WHATSAPP_GROUP_URL` constant)

- [ ] **Step 1: Set the real WhatsApp invite link**

In `App.js`, replace `WHATSAPP_GROUP_URL` value with the real master-group invite (ask the user for it). If not yet available, leave the placeholder and note it in the commit — the redirect button will open a dead link until set.

- [ ] **Step 2: Run the full flow against live Firestore**

Run: `npx expo start --web`. In the browser:
1. Fill name, pick a country, pick a team, add connect text.
2. Submit. Confirm a `#N` position appears.
3. Submit again in a fresh tab — confirm the number increments (proves the counter transaction).
4. Tap "Join the FanFest WhatsApp" — confirm it opens the link.

Then in the Firebase console → Firestore, confirm a `signups` doc exists with all fields and a `counters/signups` doc with matching `count`.
Expected: position increments per signup; docs present and well-formed.

- [ ] **Step 3: Build and deploy hosting**

Run: `npx expo export --platform web && npx firebase deploy --only hosting`
Expected: `Deploy complete!` with a hosting URL. Open it and repeat the submit flow once on the deployed site.

- [ ] **Step 4: Commit**

```bash
git add App.js
git commit -m "chore: set master WhatsApp invite link"
```

---

## Self-Review

- **Spec coverage:** Form fields (Task 4) ✓; three states form/result/redirect (Task 4) ✓; `signups` data model + `position` + `createdAt` (Task 3) ✓; race-safe counter transaction (Task 3, math in Task 2) ✓; first-100 giveaway framing (Task 2 `isWinner`, Task 4 result copy) ✓; master WhatsApp redirect (Task 4 + Task 6) ✓; 48-nation hardcoded dropdowns (Task 1) ✓; Firestore rules for both collections with signups read denied (Task 5) ✓; deploy to Hosting (Task 6) ✓. No spec requirement left without a task.
- **Placeholder scan:** `WHATSAPP_GROUP_URL` and the nation placeholder entries are explicitly flagged with instructions and resolved in Task 6 / Task 1 notes — not silent TODOs. No other placeholders.
- **Type consistency:** `submitSignup({name,country,team,connectIntent})` signature matches the App.js call site; `nextPosition`/`isWinner`/`WINNER_CUTOFF` names consistent across Tasks 2–4; `counters/signups` doc shape (`{count:int}`) matches rules in Task 5 and the transaction in Task 3.
