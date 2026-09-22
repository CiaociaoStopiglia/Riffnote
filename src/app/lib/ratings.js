// src/app/lib/ratings.js
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  collectionGroup,
  where,
  query,
  orderBy,
  limit as fbLimit,
  runTransaction,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';

/**
 * Modelo de dados:
 * users/{uid}/ratings/{albumId} -> { rating, review, albumTitle, ... }
 * users/{uid}.ratingsCount      -> contador atômico
 * albumStats/{albumId}          -> agregado comunitário (sum/count/average)
 */

export async function getUserRating(uid, albumId) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'ratings', String(albumId)));
  return snap.exists() ? snap.data() : null;
}

/**
 * Tags livres numa avaliação já existente (ex: "clássico pessoal",
 * "nostalgia", "descoberta recente"). Só funciona em cima de um álbum que
 * a pessoa já avaliou — tag sem nota não faz muito sentido no modelo atual.
 */
export async function updateAlbumTags(uid, albumId, tags) {
  await updateDoc(doc(db, 'users', uid, 'ratings', String(albumId)), {
    tags,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Média comunitária (todo mundo que avaliou) de UM álbum específico —
 * usado na página do álbum, ao lado da nota pessoal do usuário.
 */
export async function getAlbumStats(albumId) {
  const snap = await getDoc(doc(db, 'albumStats', String(albumId)));
  return snap.exists() ? snap.data() : null;
}

export async function rateAlbum(uid, album, rating, review = '') {
  const userRatingRef = doc(db, 'users', uid, 'ratings', String(album.id));
  const statsRef = doc(db, 'albumStats', String(album.id));
  const userRef = doc(db, 'users', uid);

  let wasNew = false;

  await runTransaction(db, async (tx) => {
    const userRatingSnap = await tx.get(userRatingRef);
    const statsSnap = await tx.get(statsRef);

    wasNew = !userRatingSnap.exists();
    const previousRating = wasNew ? 0 : userRatingSnap.data().rating;

    const prevSum = statsSnap.exists() ? statsSnap.data().sum || 0 : 0;
    const prevCount = statsSnap.exists() ? statsSnap.data().count || 0 : 0;

    const newSum = prevSum - previousRating + rating;
    const newCount = wasNew ? prevCount + 1 : prevCount;
    const newAverage = newCount > 0 ? newSum / newCount : 0;

    tx.set(
      userRatingRef,
      {
        albumId: album.id,
        albumTitle: album.title,
        albumArtist: album.artist,
        artwork: album.artwork || null,
        rating,
        review: review || '',
        updatedAt: serverTimestamp(),
        ...(wasNew ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: true }
    );

    tx.set(
      statsRef,
      {
        albumId: album.id,
        albumTitle: album.title,
        albumArtist: album.artist,
        artwork: album.artwork || null,
        sum: newSum,
        count: newCount,
        average: newAverage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (wasNew) {
      tx.update(userRef, { ratingsCount: increment(1) });
    }
  });

  logActivity(uid, {
    type: 'rated',
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    artwork: album.artwork || null,
    rating,
    review: review || '',
  });
}

export async function removeRating(uid, albumId) {
  const userRatingRef = doc(db, 'users', uid, 'ratings', String(albumId));
  const statsRef = doc(db, 'albumStats', String(albumId));
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const userRatingSnap = await tx.get(userRatingRef);
    if (!userRatingSnap.exists()) return;

    const previousRating = userRatingSnap.data().rating;
    const statsSnap = await tx.get(statsRef);
    const prevSum = statsSnap.exists() ? statsSnap.data().sum || 0 : 0;
    const prevCount = statsSnap.exists() ? statsSnap.data().count || 0 : 0;

    const newSum = Math.max(0, prevSum - previousRating);
    const newCount = Math.max(0, prevCount - 1);
    const newAverage = newCount > 0 ? newSum / newCount : 0;

    tx.delete(userRatingRef);
    tx.set(statsRef, { sum: newSum, count: newCount, average: newAverage }, { merge: true });
    tx.update(userRef, { ratingsCount: increment(-1) });
  });
}

export async function listUserRatings(uid) {
  const q = query(collection(db, 'users', uid, 'ratings'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function listTopRatedAlbums(max = 12) {
  const q = query(collection(db, 'albumStats'), orderBy('average', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Todas as avaliações (de todo mundo) de UM álbum, mais recentes primeiro,
 * já com nome/foto/moldura de quem avaliou. Usa collection group em
 * `ratings`. O albumId é buscado nos dois formatos (número/texto) porque
 * notas antigas foram gravadas com o tipo do id do iTunes.
 */
export async function listAlbumRatings(albumId) {
  const ids = [String(albumId)];
  const numericId = Number(albumId);
  if (!Number.isNaN(numericId)) ids.push(numericId);

  const snap = await getDocs(query(collectionGroup(db, 'ratings'), where('albumId', 'in', ids)));

  const ratings = snap.docs
    .map((d) => ({ uid: d.ref.parent.parent?.id, ...d.data() }))
    .filter((r) => r.uid && r.rating > 0)
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));

  const uniqueUids = [...new Set(ratings.map((r) => r.uid))];
  const profiles = {};
  await Promise.all(
    uniqueUids.map(async (uid) => {
      try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) profiles[uid] = userSnap.data();
      } catch {
        // sem perfil legível: cai no "Usuário" anônimo
      }
    })
  );

  return ratings.map((r) => ({
    uid: r.uid,
    rating: r.rating,
    review: (r.review || '').trim(),
    updatedAt: r.updatedAt?.toMillis?.() ?? null,
    displayName: profiles[r.uid]?.displayName || 'Usuário',
    photoURL: profiles[r.uid]?.photoURL || null,
    avatarFrame: profiles[r.uid]?.avatarFrame || 'none',
  }));
}
