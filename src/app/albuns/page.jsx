// src/app/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { fetchNewReleases, fetchTopAlbums } from '../lib/musicApi';
import { listTopRatedAlbums } from '../lib/ratings';
import AlbumCard from '../components/AlbumCard';
import styles from './page.module.css';

export default function AlbunsPage() {
  const [newReleases, setNewReleases] = useState([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [newError, setNewError] = useState(false);

  const [mostPlayed, setMostPlayed] = useState([]);
  const [loadingMostPlayed, setLoadingMostPlayed] = useState(true);

  const [topRated, setTopRated] = useState([]);
  const [loadingTopRated, setLoadingTopRated] = useState(true);

  useEffect(() => {
    fetchNewReleases({ limit: 12 })
      .then(setNewReleases)
      .catch(() => setNewError(true))
      .finally(() => setLoadingNew(false));

    fetchTopAlbums({ limit: 12 })
      .then(setMostPlayed)
      .catch(() => toast.error('Não consegui carregar os mais ouvidos.'))
      .finally(() => setLoadingMostPlayed(false));

    listTopRatedAlbums(12)
      .then(setTopRated)
      .catch(() => {})
      .finally(() => setLoadingTopRated(false));
  }, []);

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Álbuns</h1>
        <p className={styles.pageSub}>Descubra, explore e avalie o que está tocando.</p>
      </div>

      {/* Descobertas da semana */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <Sparkles size={18} />
            Descobertas da semana
          </h2>
        </div>
        {loadingNew ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando lançamentos…</span>
          </div>
        ) : newError || newReleases.length === 0 ? (
          <div className={styles.emptyState}>
            Não consegui carregar os lançamentos recentes agora. Tenta de novo mais tarde.
          </div>
        ) : (
          <div className={styles.grid}>
            {newReleases.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* Mais ouvidos */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={18} />
            Mais ouvidos
          </h2>
          <span className={styles.sectionNote}>chart oficial Apple Music</span>
        </div>
        {loadingMostPlayed ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando…</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {mostPlayed.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* Mais bem avaliados (comunidade Riffnote) */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <Trophy size={18} />
            Mais bem avaliados
          </h2>
          <span className={styles.sectionNote}>pela comunidade Riffnote</span>
        </div>
        {loadingTopRated ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando…</span>
          </div>
        ) : topRated.length === 0 ? (
          <div className={styles.emptyState}>
            Ninguém avaliou nenhum álbum ainda. Seja o primeiro!
          </div>
        ) : (
          <div className={styles.grid}>
            {topRated.map((item) => (
              <AlbumCard
                key={item.albumId}
                album={{
                  id: item.albumId,
                  title: item.albumTitle,
                  artist: item.albumArtist,
                  artwork: item.artwork,
                }}
                average={item.average}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
