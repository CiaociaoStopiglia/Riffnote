// src/app/lib/lists.js
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';

/**
 * Coleção de nível raiz "lists" (não subcoleção do usuário) — assim uma
 * lista tem uma URL própria (/lista/{listId}) sem precisar do uid no
 * caminho. Cada doc guarda quem é o dono em `ownerId`.
 *
 * lists/{listId} -> { ownerId, title, description, items: [album, ...], createdAt, updatedAt }
 *
 * `items` fica embutido como array no próprio documento (em vez de
 * subcoleção) porque isso deixa reordenar trivial: só sobrescreve o
 * array inteiro na nova ordem.
 */

export async function createList(uid, title, description = '') {
  const ref = await addDoc(collection(db, 'lists'), {
    ownerId: uid,
    title,
    description,
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  logActivity(uid, { type: 'list_created', listId: ref.id, title });

  return ref.id;
}

export async function deleteList(listId) {
  await deleteDoc(doc(db, 'lists', listId));
}

export async function renameList(listId, title, description) {
  await updateDoc(doc(db, 'lists', listId), {
    title,
    description,
    updatedAt: serverTimestamp(),
  });
}

export async function getList(listId) {
  const snap = await getDoc(doc(db, 'lists', listId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listUserLists(uid) {
  const q = query(collection(db, 'lists'), where('ownerId', '==', uid));
  const snap = await getDocs(q);
  const lists = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // Ordena no cliente (evita exigir índice composto no Firestore).
  return lists.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
}

export async function addAlbumToList(listId, album) {
  const list = await getList(listId);
  if (!list) throw new Error('Lista não encontrada.');
  if (list.items.some((item) => item.id === album.id)) return; // já está na lista

  const newItems = [
    ...list.items,
    { id: album.id, title: album.title, artist: album.artist, artwork: album.artwork || null },
  ];

  await updateDoc(doc(db, 'lists', listId), { items: newItems, updatedAt: serverTimestamp() });
}

export async function removeAlbumFromList(listId, albumId) {
  const list = await getList(listId);
  if (!list) return;

  const newItems = list.items.filter((item) => item.id !== albumId);
  await updateDoc(doc(db, 'lists', listId), { items: newItems, updatedAt: serverTimestamp() });
}

export async function reorderListItems(listId, newItems) {
  await updateDoc(doc(db, 'lists', listId), { items: newItems, updatedAt: serverTimestamp() });
}
