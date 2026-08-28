// src/app/lib/tierlists.js
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createNotification } from './notifications';

const DEFAULT_TIERS = [
  { id: 'S', label: 'S', color: '#e8963c', items: [] },
  { id: 'A', label: 'A', color: '#e06a4d', items: [] },
  { id: 'B', label: 'B', color: '#3fa796', items: [] },
  { id: 'C', label: 'C', color: '#8a9a5b', items: [] },
  { id: 'D', label: 'D', color: '#6f6860', items: [] },
];

// tierLists/{id} -> { ownerId, ownerName, title, pool: [album,...], tiers: [...], createdAt, updatedAt }

export async function createTierList(user, title) {
  const ref = await addDoc(collection(db, 'tierLists'), {
    ownerId: user.uid,
    ownerName: user.displayName || user.email,
    title,
    pool: [],
    tiers: DEFAULT_TIERS.map((t) => ({ ...t, items: [] })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTierList(id) {
  const snap = await getDoc(doc(db, 'tierLists', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveTierList(id, { pool, tiers }) {
  await updateDoc(doc(db, 'tierLists', id), { pool, tiers, updatedAt: serverTimestamp() });
}

export async function deleteTierList(id) {
  await deleteDoc(doc(db, 'tierLists', id));
}

export async function listPublicTierLists(max = 24) {
  const q = query(collection(db, 'tierLists'), orderBy('updatedAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * "Deixa pra outras pessoas montarem": pega os mesmos álbuns de uma tier
 * list existente (todos voltam pro pool, sem ranking nenhum) e cria uma
 * cópia nova em nome de quem clonou — pra essa pessoa montar a ranking
 * dela do zero, com o mesmo conjunto de álbuns. Tipo um "modo desafio".
 */
export async function cloneTierListAsChallenge(sourceId, user) {
  const source = await getTierList(sourceId);
  if (!source) throw new Error('Tier list original não encontrada.');

  const allAlbums = [
    ...source.pool,
    ...source.tiers.flatMap((t) => t.items),
  ];

  const ref = await addDoc(collection(db, 'tierLists'), {
    ownerId: user.uid,
    ownerName: user.displayName || user.email,
    title: `${source.title} (minha versão)`,
    pool: allAlbums,
    tiers: DEFAULT_TIERS.map((t) => ({ ...t, items: [] })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (source.ownerId !== user.uid) {
    createNotification(source.ownerId, {
      type: 'tierlist_clone',
      fromUid: user.uid,
      fromName: user.displayName || user.email,
      fromPhoto: user.photoURL || null,
      tierListId: sourceId,
      tierListTitle: source.title,
    }).catch(() => {});
  }

  return ref.id;
}