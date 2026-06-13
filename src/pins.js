import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import env from './env';

// Virtual pin trading. Each fan's "pin" is their country. Meeting another fan
// and scanning their QR records a `connections` doc; both fans then collect each
// other's country pin. Env-namespaced like signups.
const SIGNUPS = `signups${env.suffix}`;
const CONNECTIONS = `connections${env.suffix}`;

// Fetch a fan's public profile by id (for the trade prompt).
export async function getPublicFan(id) {
  if (!id) return null;
  const snap = await getDoc(doc(db, SIGNUPS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Record a trade between `me` and `them`. Idempotent: the doc id is the sorted
// pair, so two fans only ever get one connection (a re-scan is a no-op). Only a
// create is performed (rules deny updates), so re-trades don't error out.
export async function recordTrade(me, them) {
  if (!me || !them || !me.id || !them.id || me.id === them.id) return 'invalid';
  const pair = [me.id, them.id].sort();
  const ref = doc(db, CONNECTIONS, pair.join('__'));
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) return 'already';
    tx.set(ref, {
      participants: pair,
      fans: {
        [me.id]: { firstName: me.firstName || '', country: me.country || '' },
        [them.id]: { firstName: them.firstName || '', country: them.country || '' },
      },
      byUid: auth.currentUser ? auth.currentUser.uid : null,
      createdAt: serverTimestamp(),
    });
    return 'traded';
  });
}

// Live-subscribe to my trades (connections I'm part of), newest first.
export function subscribeToConnections(myId, cb) {
  if (!myId) {
    cb([]);
    return () => {};
  }
  const q = query(collection(db, CONNECTIONS), where('participants', 'array-contains', myId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      cb(list);
    },
    () => cb([])
  );
}

// Given my id + my connections, the set of countries I've collected (incl. mine).
export function collectedCountries(myId, myCountry, connections) {
  const set = new Set();
  if (myCountry) set.add(myCountry);
  for (const c of connections || []) {
    const otherId = (c.participants || []).find((p) => p !== myId);
    const other = otherId && c.fans ? c.fans[otherId] : null;
    if (other && other.country) set.add(other.country);
  }
  return set;
}
