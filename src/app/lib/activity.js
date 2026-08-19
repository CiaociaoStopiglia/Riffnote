// src/app/lib/activity.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * users/{uid}/activity/{autoId} -> { type, ...dados do evento, createdAt }
 * type pode ser: 'rated' | 'list_created' | 'listenlist_added'
 */
export async function logActivity(uid, entry) {
  try {
    await addDoc(collection(db, 'users', uid, 'activity'), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Atividade é "nice to have" — se falhar, não deve quebrar a ação principal.
    console.error('Falha ao registrar atividade', err);
  }
}

export async function listActivity(uid, max = 30) {
  const q = query(
    collection(db, 'users', uid, 'activity'),
    orderBy('createdAt', 'desc'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
