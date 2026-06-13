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
