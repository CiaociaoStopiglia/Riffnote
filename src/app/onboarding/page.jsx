// src/app/onboarding/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import { fetchTopAlbums } from '../lib/musicApi';
import { rateAlbum } from '../lib/ratings';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import styles from './page.module.css';

const GOAL = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({}); // { albumId: nota }
  const [saving, setSaving] = useState(null); // albumId sendo salvo agora

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    fetchTopAlbums({ limit: 12 })
      .then(setAlbums)
      .catch(() => toast.error('Não consegui carregar sugestões de álbum.'))
      .finally(() => setLoading(false));
  }, []);

  const ratedCount = Object.keys(ratings).length;
  const done = ratedCount >= GOAL;

  async function handleRate(album, value) {
    if (!user) return;
    setSaving(album.id);
    try {
      await rateAlbum(user.uid, album, value);
      setRatings((prev) => ({ ...prev, [album.id]: value }));
    } catch (err) {
      toast.error('Não consegui salvar essa avaliação. Tenta de novo.');
    } finally {
      setSaving(null);
    }
  }

  function finish() {
    toast.success('Prontinho! Seu Riffnote já começou.');
    router.push('/');
  }

  if (loadingUser || !user) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>bem-vindo(a) ao riffnote</span>
        <h1 className={styles.title}>Avalia uns álbuns pra começar seu histórico</h1>
        <p className={styles.sub}>
          Escolhe {GOAL} da lista abaixo (ou mais, se quiser). Não precisa ser álbum que
          você conhece bem — dá pra editar a nota depois, a qualquer hora.
        </p>

        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            <span>{Math.min(ratedCount, GOAL)} de {GOAL}</span>
            <span>{done ? 'pronto!' : 'continua'}</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, (ratedCount / GOAL) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingRow}>
          <Spin /> <span>carregando sugestões…</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {albums.map((album) => {
            const rating = ratings[album.id] || 0;
            return (
              <div key={album.id} className={styles.card}>
                <div className={styles.coverWrap}>
                  {album.artwork ? (
                    <img src={album.artwork} alt={album.title} />
                  ) : null}
                  {rating > 0 && (
                    <div className={styles.ratedOverlay}>
                      <Check size={28} />
                    </div>
                  )}
                </div>
                <div className={styles.cardTitle}>{album.title}</div>
                <div className={styles.cardArtist}>{album.artist}</div>
                <div className={styles.cardStars}>
                  <StarRating
                    value={rating}
                    onChange={(v) => handleRate(album, v)}
                    size={18}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.continueBtn} onClick={finish} disabled={!done}>
          {done ? 'Ir pro Riffnote' : `Avalia mais ${GOAL - ratedCount}`}
        </button>
        <button type="button" className={styles.skipBtn} onClick={finish}>
          pular por enquanto
        </button>
      </div>
    </div>
  );
}
