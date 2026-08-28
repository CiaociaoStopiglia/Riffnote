// src/app/lib/notifications.js
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// users/{uid}/notifications/{id} -> {
//   type: 'follow' | 'answer' | 'tierlist_clone',
//   read: boolean, createdAt,
//   fromUid, fromName, fromPhoto,
//   ...campos extras dependendo do tipo (questionId, tierListId, etc.)
// }

export async function createNotification(toUid, data) {
  if (!toUid) return;
  await addDoc(collection(db, 'users', toUid, 'notifications'), {
    read: false,
    createdAt: serverTimestamp(),
    ...data,
  });
}

export async function listNotifications(uid, max = 30) {
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function markNotificationRead(uid, notifId) {
  await updateDoc(doc(db, 'users', uid, 'notifications', notifId), { read: true });
}

export async function markAllRead(uid, notifications) {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;

  const batch = writeBatch(db);
  unread.forEach((n) => {
    batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true });
  });
  await batch.commit();
}