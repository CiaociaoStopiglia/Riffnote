// src/app/lib/users.js
import { collection, query, orderBy, where, limit as fbLimit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Busca usuários pelo nome (prefixo, sensível a maiúsculas/minúsculas —
 * limitação do Firestore, que não tem busca de texto completo nativa).
 */
export async function searchUsers(term, max = 20) {
  const clean = term.trim();
  if (!clean) return [];

  const q = query(
    collection(db, 'users'),
    orderBy('displayName'),
    where('displayName', '>=', clean),
    where('displayName', '<=', clean + '\uf8ff'),
    fbLimit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

/**
 * Sugestões de gente nova por aqui (cadastros mais recentes) — usado
 * como "descubra pessoas" quando não há busca ativa.
 */
export async function listRecentUsers(max = 20) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), fbLimit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}
