import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { nextPosition } from './position';
import { postIntro } from './feed';
import env from './env';

// Env-namespaced collections: prod writes to `signups`/`counters/signups`, dev
// (expo start) writes to the `_dev` variants so local testing never pollutes
// real event data.
//
// Signup data is split by privacy:
//  - SIGNUPS (public read) — the fan directory: firstName, country, team,
//    lookingType, position. Safe to show to everyone.
//  - PRIVATE (read denied) — fullName + lookingGoal, for organizers only.
// Both docs share the same id.
const SIGNUPS = `signups${env.suffix}`;
const PRIVATE = `signups_private${env.suffix}`;
const COUNTER_ID = `signups${env.suffix}`;

// Live total signup count (the counters/<COUNTER_ID> doc).
export function subscribeToCount(cb) {
  const counterRef = doc(db, 'counters', COUNTER_ID);
  return onSnapshot(
    counterRef,
    (snap) => cb(snap.exists() ? snap.data().count || 0 : 0),
    () => cb(0)
  );
}

// Live fan directory — most recent `max` public signups, newest first.
// Returns an array of { id, firstName, country, team, lookingType, position }.
export function subscribeToFans(cb, max = 150) {
  const q = query(collection(db, SIGNUPS), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

// Atomically assigns a 1-based join position and writes the public + private
// signup docs. Returns { position, firstName, id }. Race-safe: the counter
// read+write is inside one transaction. The fan's anonymous uid (if signed in)
// is stored on the private doc so writes can be tied to an identity.
export async function submitSignup({ name, country, team, lookingType, lookingGoal }) {
  const fullName = name.trim();
  const firstName = fullName.split(/\s+/)[0] || fullName;
  const uid = auth.currentUser ? auth.currentUser.uid : null;

  const counterRef = doc(db, 'counters', COUNTER_ID);
  const publicRef = doc(collection(db, SIGNUPS));
  const privateRef = doc(db, PRIVATE, publicRef.id);

  const position = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists() ? counterSnap.data().count : 0;
    const pos = nextPosition(current);

    tx.set(publicRef, {
      firstName,
      country: country || '',
      team: team || '',
      lookingType,
      position: pos,
      createdAt: serverTimestamp(),
    });
    tx.set(privateRef, {
      fullName,
      lookingGoal: (lookingGoal || '').trim(),
      uid,
      createdAt: serverTimestamp(),
    });
    tx.set(counterRef, { count: pos }, { merge: true });
    return pos;
  });

  // Auto-post the fan's intro to the public community feed. Best-effort: a feed
  // failure must not fail the signup, so swallow errors.
  postIntro({ firstName, country, team, lookingType, lookingGoal, position }).catch(() => {});

  return { position, firstName, id: publicRef.id };
}
