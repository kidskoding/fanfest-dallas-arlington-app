import {
  doc,
  collection,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { nextPosition } from './position';
import env from './env';

// Env-namespaced collection names: prod writes to `signups`/`counters/signups`,
// dev (expo start) writes to `signups_dev`/`counters/signups_dev` so local
// testing never pollutes real event data.
const SIGNUPS = `signups${env.suffix}`;
const COUNTER_ID = `signups${env.suffix}`;

// Live-subscribe to the total signup count (the counters/<COUNTER_ID> doc).
// Calls `cb(count)` on every change. Returns the unsubscribe fn.
// Reads are allowed on counters/* by the Firestore rules.
export function subscribeToCount(cb) {
  const counterRef = doc(db, 'counters', COUNTER_ID);
  return onSnapshot(
    counterRef,
    (snap) => cb(snap.exists() ? snap.data().count || 0 : 0),
    () => cb(0)
  );
}

// Atomically assigns a 1-based signup position and writes the signup doc.
// Returns the assigned position. Race-safe: two concurrent signups never
// collide on a number because the counter read+write is inside one transaction.
export async function submitSignup({ name, country, team, connectIntent }) {
  const counterRef = doc(db, 'counters', COUNTER_ID);
  const signupRef = doc(collection(db, SIGNUPS));

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
