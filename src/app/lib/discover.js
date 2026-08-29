// src/app/lib/discover.js
import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// users/{uid}/discoverDecisions/{albumId} -> { decision: 'liked'|'skipped', ... }
// Guarda a decisão mais recente por álbum — se a pessoa curtir e mais tarde
// mudar de ideia (raro, mas possível numa próxima rodada), sobrescreve.

export async function recordDiscoverDecision(uid, album, decision) {
  await setDoc(
    doc(db, 'users', uid, 'discoverDecisions', String(album.id)),
    {
      decision,
      albumId: String(album.id),
      albumTitle: album.title,
      albumArtist: album.artist,
      artwork: album.artwork || null,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listDiscoverDecisions(uid) {
  const q = query(
    collection(db, 'users', uid, 'discoverDecisions'),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => d.data());
  return {
    liked: all.filter((a) => a.decision === 'liked'),
    skipped: all.filter((a) => a.decision === 'skipped'),
  };
}
