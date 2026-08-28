// src/app/lib/social.js
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  increment,
  collection,
  getDocs,
  query,
  orderBy,
  limit as fbLimit,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';

/**
 * Modelo de dados no Firestore:
 * users/{uid}                          -> perfil (inclui followersCount, followingCount)
 * users/{uid}/following/{targetUid}    -> marca que {uid} segue {targetUid}
 * users/{uid}/followers/{followerUid}  -> marca que {followerUid} segue {uid}
 *
 * Guardamos a relação nos dois sentidos pra listar "seguindo" e "seguidores"
 * sem precisar de query cruzada, e mantemos contadores no doc do usuário
 * (increment atômico) pra não ter que contar documentos toda hora.
 */

export async function isFollowing(currentUid, targetUid) {
  if (!currentUid || !targetUid) return false;
  const snap = await getDoc(doc(db, 'users', currentUid, 'following', targetUid));
  return snap.exists();
}

export async function followUser(currentUid, targetUid, currentUserProfile = {}) {
  if (currentUid === targetUid) throw new Error('Você não pode seguir a si mesmo.');

  const batch = writeBatch(db);

  batch.set(doc(db, 'users', currentUid, 'following', targetUid), {
    createdAt: Date.now(),
  });
  batch.set(doc(db, 'users', targetUid, 'followers', currentUid), {
    createdAt: Date.now(),
  });
  batch.update(doc(db, 'users', currentUid), { followingCount: increment(1) });
  batch.update(doc(db, 'users', targetUid), { followersCount: increment(1) });

  await batch.commit();

  createNotification(targetUid, {
    type: 'follow',
    fromUid: currentUid,
    fromName: currentUserProfile.displayName || currentUserProfile.email || 'alguém',
    fromPhoto: currentUserProfile.photoURL || null,
  }).catch(() => {});
}

export async function unfollowUser(currentUid, targetUid) {
  const batch = writeBatch(db);

  batch.delete(doc(db, 'users', currentUid, 'following', targetUid));
  batch.delete(doc(db, 'users', targetUid, 'followers', currentUid));
  batch.update(doc(db, 'users', currentUid), { followingCount: increment(-1) });
  batch.update(doc(db, 'users', targetUid), { followersCount: increment(-1) });

  await batch.commit();
}

async function listRelation(uid, subcollection, max = 50) {
  const q = query(
    collection(db, 'users', uid, subcollection),
    orderBy('createdAt', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  const otherUids = snap.docs.map((d) => d.id);

  // Busca o perfil de cada usuário relacionado (nome, foto).
  const profiles = await Promise.all(
    otherUids.map(async (otherUid) => {
      const userSnap = await getDoc(doc(db, 'users', otherUid));
      return { uid: otherUid, ...(userSnap.exists() ? userSnap.data() : {}) };
    })
  );

  return profiles;
}

export function listFollowing(uid, max = 50) {
  return listRelation(uid, 'following', max);
}

export function listFollowers(uid, max = 50) {
  return listRelation(uid, 'followers', max);
}