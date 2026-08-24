// src/app/profile/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { listUserRatings } from '../../lib/ratings';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';
import styles from './page.module.css';

export default function AllRatedAlbumsPage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;
    listUserRatings(user.uid)
      .then(setAlbums)
      .finally(() => setLoading(false));
  }, [user]);

  if (loadingUser || !user || loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/profile" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pro perfil
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Seus álbuns avaliados</h1>
        <p className={styles.sub}>{albums.length} álbuns no total</p>
      </div>

      <div className={styles.section}>
        {albums.length === 0 ? (
          <div className={styles.emptyState}>Você ainda não avaliou nenhum álbum.</div>
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