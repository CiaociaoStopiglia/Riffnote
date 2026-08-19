// src/app/lib/listenlist.js
import { doc, setDoc, deleteDoc, getDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';

// users/{uid}/listenlist/{albumId} -> { albumId, albumTitle, albumArtist, artwork, addedAt }

export async function isInListenlist(uid, albumId) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, 'users', uid, 'listenlist', String(albumId)));
  return snap.exists();
}

export async function addToListenlist(uid, album) {
  await setDoc(doc(db, 'users', uid, 'listenlist', String(album.id)), {
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    artwork: album.artwork || null,
    addedAt: serverTimestamp(),
  });

  logActivity(uid, {
    type: 'listenlist_added',
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    artwork: album.artwork || null,
  });
}

export async function removeFromListenlist(uid, albumId) {
  await deleteDoc(doc(db, 'users', uid, 'listenlist', String(albumId)));
}

export async function listListenlist(uid, max = 100) {
  const q = query(collection(db, 'users', uid, 'listenlist'), orderBy('addedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.slice(0, max).map((d) => d.data());
}
