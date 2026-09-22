// src/app/components/AlbumReviews.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spin } from 'antd';
import { listAlbumRatings } from '../lib/ratings';
import StarRating from './StarRating';
import AvatarFrame from './AvatarFrame';
import styles from './AlbumReviews.module.css';

const INITIAL_VISIBLE = 3;
const LOAD_MORE_STEP = 5;

export default function AlbumReviews({ albumId, refreshKey = 0 }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  // refreshKey muda quando a pessoa salva/remove a própria nota, pra lista
  // refletir na hora.
  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    setLoading(true);
    listAlbumRatings(albumId)
      .then((data) => {
        if (!cancelled) setRatings(data);
      })
      .catch((err) => {
        console.error('Erro ao carregar avaliações do álbum:', err);
        if (!cancelled) setRatings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [albumId, refreshKey]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="small" /> carregando avaliações…
      </div>
    );
  }

  if (ratings.length === 0) return null;

  const shown = ratings.slice(0, visible);
  const hasMore = ratings.length > visible;

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>
        Avaliações <span className={styles.count}>{ratings.length}</span>
      </div>

      <div className={`${styles.list} ${hasMore ? styles.listFaded : ''}`}>
        {shown.map((r) => (
          <div key={r.uid} className={styles.item}>
            <Link href={`/profile/${r.uid}`} className={styles.avatarLink}>
              <AvatarFrame frame={r.avatarFrame}>
                {r.photoURL ? (
                  <img src={r.photoURL} alt={r.displayName} className={styles.avatar} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {r.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </AvatarFrame>
            </Link>

            <div className={styles.body}>
              <div className={styles.head}>
                <Link href={`/profile/${r.uid}`} className={styles.name}>
                  {r.displayName}
                </Link>
                <StarRating value={r.rating} readOnly size={13} />
                <span className={styles.score}>{r.rating}/5</span>
              </div>
              {r.review && <p className={styles.review}>{r.review}</p>}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className={styles.moreBtn}
          onClick={() => setVisible((v) => v + LOAD_MORE_STEP)}
        >
          ver mais
        </button>
      )}
    </div>
  );
}
