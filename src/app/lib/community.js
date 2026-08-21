// src/app/lib/community.js
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

// communityComments/{id} -> feed global, não é por álbum — é o mural da comunidade.

export async function postComment(user, text) {
  await addDoc(collection(db, 'communityComments'), {
    authorId: user.uid,
    authorName: user.displayName || user.email,
    authorPhoto: user.photoURL || null,
    text,
    createdAt: serverTimestamp(),
  });
}

export async function listComments(max = 50) {
  const q = query(collection(db, 'communityComments'), orderBy('createdAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
