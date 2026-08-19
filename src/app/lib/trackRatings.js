// src/app/lib/trackRatings.js
import {
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';

/**
 * Mesmo padrão das avaliações de álbum, só que por faixa:
 * users/{uid}/trackRatings/{trackId} -> avaliação individual
 * trackStats/{trackId}               -> agregado comunitário (média de todos)
 *
 * trackId vem do iTunes (globalmente único por faixa, mesmo entre álbuns
 * diferentes), então não precisa combinar com albumId pra identificar.
 */

export async function getUserTrackRatingsForAlbum(uid, albumId) {
  if (!uid) return {};
  const q = query(
    collection(db, 'users', uid, 'trackRatings'),
    where('albumId', '==', String(albumId))
  );
  const snap = await getDocs(q);
  const map = {};
  snap.docs.forEach((d) => {
    map[d.id] = d.data();
  });
  return map;
}

export async function rateTrack(uid, track, album, rating) {
  const trackRatingRef = doc(db, 'users', uid, 'trackRatings', String(track.id));
  const statsRef = doc(db, 'trackStats', String(track.id));

  await runTransaction(db, async (tx) => {
    const trackSnap = await tx.get(trackRatingRef);
    const statsSnap = await tx.get(statsRef);

    const wasNew = !trackSnap.exists();
    const previousRating = wasNew ? 0 : trackSnap.data().rating;

    const prevSum = statsSnap.exists() ? statsSnap.data().sum || 0 : 0;
    const prevCount = statsSnap.exists() ? statsSnap.data().count || 0 : 0;
    const newSum = prevSum - previousRating + rating;
    const newCount = wasNew ? prevCount + 1 : prevCount;
    const newAverage = newCount > 0 ? newSum / newCount : 0;

    tx.set(
      trackRatingRef,
      {
        trackId: track.id,
        trackTitle: track.title,
        trackNumber: track.number || null,
        albumId: album.id,
        albumTitle: album.title,
        albumArtist: album.artist,
        artwork: album.artwork || null,
        rating,
        updatedAt: serverTimestamp(),
        ...(wasNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true }
    );

    tx.set(
      statsRef,
      {
        trackId: track.id,
        trackTitle: track.title,
        albumId: album.id,
        albumArtist: album.artist,
        artwork: album.artwork || null,
        sum: newSum,
        count: newCount,
        average: newAverage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });

  logActivity(uid, {
    type: 'rated_track',
    trackId: track.id,
    trackTitle: track.title,
    albumId: album.id,
    albumTitle: album.title,
    artwork: album.artwork || null,
    rating,
  });
}

export async function removeTrackRating(uid, trackId) {
  const trackRatingRef = doc(db, 'users', uid, 'trackRatings', String(trackId));
  const statsRef = doc(db, 'trackStats', String(trackId));

  await runTransaction(db, async (tx) => {
    const trackSnap = await tx.get(trackRatingRef);
    if (!trackSnap.exists()) return;

    const previousRating = trackSnap.data().rating;
    const statsSnap = await tx.get(statsRef);
    const prevSum = statsSnap.exists() ? statsSnap.data().sum || 0 : 0;
    const prevCount = statsSnap.exists() ? statsSnap.data().count || 0 : 0;

    const newSum = Math.max(0, prevSum - previousRating);
    const newCount = Math.max(0, prevCount - 1);
    const newAverage = newCount > 0 ? newSum / newCount : 0;

    tx.delete(trackRatingRef);
    tx.set(statsRef, { sum: newSum, count: newCount, average: newAverage }, { merge: true });
  });
}

export async function listUserTrackRatings(uid, max = 100) {
  const q = query(collection(db, 'users', uid, 'trackRatings'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.slice(0, max).map((d) => d.data());
}

export async function listTopRatedTracks(max = 12) {
  const q = query(collection(db, 'trackStats'), orderBy('average', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
