// src/app/components/AffinityBadge.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listUserRatings } from '../lib/ratings';
import { computeAffinity, affinityLabel, MIN_SHARED_ALBUMS } from '../lib/affinity';
import styles from './AffinityBadge.module.css';

// Selo "82% de afinidade" no perfil de outra pessoa, comparando com quem está logado.
export default function AffinityBadge({ currentUid, theirRatings }) {
  const [mine, setMine] = useState(null);

  useEffect(() => {
    if (!currentUid) return;
    listUserRatings(currentUid).then(setMine).catch(() => setMine([]));
  }, [currentUid]);

  const affinity = useMemo(() => (mine ? computeAffinity(mine, theirRatings) : null), [mine, theirRatings]);

  if (!currentUid || !mine) return null;

  if (!affinity) {
    return (
      <div className={styles.badge}>
        <span className={styles.muted}>
          Afinidade: avaliem pelo menos {MIN_SHARED_ALBUMS} álbuns em comum pra calcular.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.badge}>
      <span className={styles.percent}>{affinity.percent}%</span>
      <span className={styles.text}>
        <b>{affinityLabel(affinity.percent)}</b>
        <span className={styles.muted}>
          {' '}· {affinity.sharedCount} álbuns em comum ·{' '}
          <Link href="/afinidade" className={styles.link}>
            ver quem tem seu gosto
          </Link>
        </span>
      </span>
    </div>
  );
}
