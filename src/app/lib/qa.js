// src/app/lib/qa.js
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  query,
  orderBy,
  limit as fbLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// communityQuestions/{id} -> pergunta sobre um álbum específico
// communityQuestions/{id}/answers/{aid} -> respostas dessa pergunta

export async function createQuestion(user, album, questionText) {
  const ref = await addDoc(collection(db, 'communityQuestions'), {
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    artwork: album.artwork || null,
    question: questionText,
    authorId: user.uid,
    authorName: user.displayName || user.email,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getQuestion(questionId) {
  const snap = await getDoc(doc(db, 'communityQuestions', questionId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listQuestions(max = 30) {
  const q = query(collection(db, 'communityQuestions'), orderBy('createdAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addAnswer(questionId, user, text) {
  await addDoc(collection(db, 'communityQuestions', questionId, 'answers'), {
    text,
    authorId: user.uid,
    authorName: user.displayName || user.email,
    createdAt: serverTimestamp(),
  });
}

export async function listAnswers(questionId) {
  const q = query(
    collection(db, 'communityQuestions', questionId, 'answers'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
