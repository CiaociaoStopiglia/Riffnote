// src/app/afinidade/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { listUserRatings } from '../lib/ratings';
import { listRecentUsers } from '../lib/users';
import { computeAffinity, affinityLabel, MIN_SHARED_ALBUMS } from '../lib/affinity';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';

const CANDIDATES = 40; // limita as leituras: compara com os usuários mais recentes
const CHUNK = 8;

async function findMatches(uid) {
  const [mine, people] = await Promise.all([listUserRatings(uid), listRecentUsers(CANDIDATES)]);
  const others = people.filter((p) => p.uid !== uid);
  const matches = [];

  for (let i = 0; i < others.length; i += CHUNK) {
    const chunk = others.slice(i, i + CHUNK);
    const ratings = await Promise.all(chunk.map((p) => listUserRatings(p.uid).catch(() => [])));
    chunk.forEach((person, idx) => {
      const affinity = computeAffinity(mine, ratings[idx]);
      if (affinity) matches.push({ person, affinity });
    });
  }

  matches.sort((a, b) => b.affinity.score - a.affinity.score);
  return { myCount: mine.length, matches };
}

export default function AfinidadePage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();
  const [state, setState] = useState({ loading: true, myCount: 0, matches: [] });

  useEffect(() => {
    if (!loadingUser && !user) router.push('/login');
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;
    findMatches(user.uid)
      .then((r) => setState({ loading: false, ...r }))
      .catch(() => setState({ loading: false, myCount: 0, matches: [] }));
  }, [user]);

  if (loadingUser || !user || state.loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
        <span>comparando seu gosto com o da galera…</span>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/usuarios" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Gosto parecido com o seu</h1>
        <p className={styles.sub}>
          Comparamos as notas dos álbuns que vocês dois avaliaram. Só entra quem tem pelo menos{' '}
          {MIN_SHARED_ALBUMS} em comum com você.
        </p>
      </div>

      <div className={styles.list}>
        {state.myCount === 0 ? (
          <div className={styles.empty}>Avalie alguns álbuns primeiro pra a gente achar seus pares.</div>
        ) : state.matches.length === 0 ? (
          <div className={styles.empty}>
            Ninguém tem {MIN_SHARED_ALBUMS}+ álbuns em comum com você ainda. Avalie mais álbuns populares!
          </div>
        ) : (
          state.matches.map(({ person, affinity }) => (
            <Link key={person.uid} href={`/profile/${person.uid}`} className={styles.row}>
              <div className={styles.avatar}>
                {person.photoURL ? (
                  <img src={person.photoURL} alt="" />
                ) : (
                  (person.displayName || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{person.displayName || 'Sem nome'}</div>
                <div className={styles.meta}>
                  {affinityLabel(affinity.percent)} · {affinity.sharedCount} álbuns em comum
                </div>
                {affinity.agree.length > 0 && (
                  <div className={styles.agree}>
                    Concordam em: {affinity.agree.map((a) => `${a.albumTitle} (${a.myRating}★)`).join(', ')}
                  </div>
                )}
                {affinity.disagree.length > 0 && (
                  <div className={styles.disagree}>
                    Divergem em:{' '}
                    {affinity.disagree
                      .map((a) => `${a.albumTitle} (você ${a.myRating}★, ${a.theirRating}★)`)
                      .join(', ')}
                  </div>
                )}
              </div>
              <div className={styles.percent}>{affinity.percent}%</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
