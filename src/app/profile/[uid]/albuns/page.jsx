// src/app/profile/[uid]/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { listUserRatings } from '../../../lib/ratings';
import StarRating from '../../../components/StarRating';
import styles from '../../albuns/page.module.css';

export default function PublicRatedAlbumsPage() {
  const { uid } = useParams();
  const [displayName, setDisplayName] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) setDisplayName(snap.data().displayName || '');
        const list = await listUserRatings(uid);
        setAlbums(list);
      } finally {
        setLoading(false);
      }
    }
    if (uid) load();
  }, [uid]);

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={`/profile/${uid}`} className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pro perfil
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Álbuns avaliados{displayName ? ` por ${displayName}` : ''}</h1>
        <p className={styles.sub}>{albums.length} álbuns no total</p>
      </div>

      <div className={styles.section}>
        {albums.length === 0 ? (
          <div className={styles.emptyState}>Nenhum álbum avaliado ainda.</div>
        ) : (
          <div className={styles.grid}>
            {albums.map((item) => (
              <div key={item.albumId} className={styles.cardWrap}>
                <Link href={`/album/${item.albumId}`} className={styles.card}>
                  {item.artwork ? (
                    <img src={item.artwork} alt={item.albumTitle} className={styles.cover} />
                  ) : (
                    <div className={styles.cover} />
                  )}
                  <div className={styles.cardTitle}>{item.albumTitle}</div>
                  <div className={styles.cardArtist}>{item.albumArtist}</div>
                  <div className={styles.cardStars}>
                    <StarRating value={item.rating} readOnly size={13} />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}