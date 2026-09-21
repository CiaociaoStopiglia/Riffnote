// src/app/lib/adminStats.js
// Leituras do painel administrativo. Todas exigem as regras de segurança de admin
// (ver firestore-analytics.rules na raiz do projeto).
import {
  collection,
  collectionGroup,
  documentId,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { dayKey } from './analytics';

const DAY_MS = 86_400_000;

export function daysAgoKey(n) {
  return dayKey(new Date(Date.now() - n * DAY_MS));
}

/** Documentos diários de analyticsDaily desde `startKey` (YYYY-MM-DD). */
export async function loadDaily(startKey) {
  const q = query(
    collection(db, 'analyticsDaily'),
    where(documentId(), '>=', startKey),
    orderBy(documentId()),
    limit(1500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ day: d.id, ...d.data() }));
}

async function countWhere(collRef, ...constraints) {
  const snap = await getCountFromServer(constraints.length ? query(collRef, ...constraints) : collRef);
  return snap.data().count;
}

/** Visitantes ativos em janelas móveis (baseado no lastSeen de cada navegador). */
export async function loadActiveVisitors() {
  const visitors = collection(db, 'analyticsVisitors');
  const since = (ms) => where('lastSeen', '>=', Timestamp.fromMillis(Date.now() - ms));
  const [online, day, week, month, year, total] = await Promise.all([
    countWhere(visitors, since(5 * 60_000)),
    countWhere(visitors, since(DAY_MS)),
    countWhere(visitors, since(7 * DAY_MS)),
    countWhere(visitors, since(30 * DAY_MS)),
    countWhere(visitors, since(365 * DAY_MS)),
    countWhere(visitors),
  ]);
  return { online, day, week, month, year, total };
}

/** Totais de conteúdo do site. Cada métrica falha sozinha (retorna null) se as regras não permitirem. */
export async function loadContentTotals() {
  const entries = [
    ['users', () => countWhere(collection(db, 'users'))],
    ['ratings', () => countWhere(collectionGroup(db, 'ratings'))],
    ['albumsRated', () => countWhere(collection(db, 'albumStats'))],
    ['tracksRated', () => countWhere(collection(db, 'trackStats'))],
    ['lists', () => countWhere(collection(db, 'lists'))],
    ['tierLists', () => countWhere(collection(db, 'tierLists'))],
    ['questions', () => countWhere(collection(db, 'communityQuestions'))],
    ['comments', () => countWhere(collection(db, 'communityComments'))],
  ];
  const results = await Promise.allSettled(entries.map(([, fn]) => fn()));
  return Object.fromEntries(entries.map(([key], i) => [key, results[i].status === 'fulfilled' ? results[i].value : null]));
}

export async function loadTops() {
  const [albums, users, visitors, recentUsers] = await Promise.allSettled([
    getDocs(query(collection(db, 'albumStats'), orderBy('count', 'desc'), limit(10))),
    getDocs(query(collection(db, 'users'), orderBy('ratingsCount', 'desc'), limit(10))),
    getDocs(query(collection(db, 'analyticsVisitors'), orderBy('lastSeen', 'desc'), limit(25))),
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(15))),
  ]);
  const rows = (r) => (r.status === 'fulfilled' ? r.value.docs.map((d) => ({ id: d.id, ...d.data() })) : []);
  return { albums: rows(albums), users: rows(users), visitors: rows(visitors), recentUsers: rows(recentUsers) };
}

/** Cadastros por dia (a partir de users.createdAt) desde `startMs`. */
export async function loadSignups(startMs) {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('createdAt', '>=', Timestamp.fromMillis(startMs)),
      orderBy('createdAt', 'asc'),
      limit(3000)
    )
  );
  const perDay = {};
  for (const d of snap.docs) {
    const seconds = d.data().createdAt?.seconds;
    if (!seconds) continue;
    const key = dayKey(new Date(seconds * 1000));
    perDay[key] = (perDay[key] || 0) + 1;
  }
  return perDay;
}
