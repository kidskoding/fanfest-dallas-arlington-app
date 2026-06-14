import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import env from './env';
import { buildIntro } from './intro';

// Public community feed of auto-generated fan intros. Env-namespaced like
// signups: prod -> `feed`, dev (expo start) -> `feed_dev`.
const FEED = `feed${env.suffix}`;

// Auto-post a fan's intro to the feed. Best-effort: callers should not block
// signup on this. `country` is kept for the flag shown next to the intro.
export function postIntro({ firstName, country, team, lookingType, lookingGoal, position }) {
  return addDoc(collection(db, FEED), {
    firstName: firstName || '',
    country: country || '',
    text: buildIntro({ firstName, country, team, lookingType, lookingGoal }),
    position: position != null ? position : null,
    createdAt: serverTimestamp(),
  });
}

// Live feed — most recent `max` intros, newest first.
export function subscribeToFeed(cb, max = 100) {
  const q = query(collection(db, FEED), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}
