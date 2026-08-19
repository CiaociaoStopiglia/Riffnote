// src/app/albuns/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, TrendingUp, Trophy, Search, X } from 'lucide-react';
import { fetchNewReleases, fetchTopAlbums, searchAlbums, searchTracks } from '../lib/musicApi';
import { listTopRatedAlbums } from '../lib/ratings';
import AlbumCard from '../components/AlbumCard';
import TrackResultRow from '../components/TrackResultRow';
import styles from './page.module.css';

export default function AlbunsPage() {
  const [newReleases, setNewReleases] = useState([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [newError, setNewError] = useState(false);

  const [mostPlayed, setMostPlayed] = useState([]);
  const [loadingMostPlayed, setLoadingMostPlayed] = useState(true);

  const [topRated, setTopRated] = useState([]);
  const [loadingTopRated, setLoadingTopRated] = useState(true);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [albumResults, setAlbumResults] = useState(null); // null = sem busca ativa
  const [trackResults, setTrackResults] = useState([]);

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

  async function handleSearch() {
    const term = query.trim();
    if (!term) {
      toast.error('Digite o nome de um álbum, artista ou música.');
      return;
    }

    setSearching(true);
    try {
      const [albums, tracks] = await Promise.all([
        searchAlbums(term, { limit: 16 }),
        searchTracks(term, { limit: 8 }),
      ]);
      if (albums.length === 0 && tracks.length === 0) {
        toast(`Nada encontrado para "${term}".`);
      }
      setAlbumResults(albums);
      setTrackResults(tracks);
    } catch (err) {
      toast.error('Não consegui completar a busca. Tenta de novo.');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setAlbumResults(null);
    setTrackResults([]);
    setQuery('');
  }

  const showingSearch = albumResults !== null;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Álbuns</h1>
        <p className={styles.pageSub}>Descubra, explore e avalie o que está tocando.</p>
      </div>

      <div className={styles.searchWrap}>
        <Input
          size="large"
          placeholder="Busque um álbum, artista ou música…"
          prefix={<Search size={16} color="#6f6860" />}
          suffix={searching ? <Spin size="small" /> : null}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
        />
      </div>

      {showingSearch ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Resultados para "{query}"</h2>
            <button type="button" className={styles.sectionLink} onClick={clearSearch}>
              limpar <X size={13} />
            </button>
          </div>

          {albumResults.length === 0 && trackResults.length === 0 ? (
            <div className={styles.emptyState}>Nada encontrado. Tenta outro termo.</div>
          ) : (
            <>
              {albumResults.length > 0 && (
                <div className={styles.grid}>
                  {albumResults.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              )}

              {trackResults.length > 0 && (
                <div className={styles.trackResultsBlock}>
                  <span className={styles.trackResultsLabel}>Músicas</span>
                  <div className={styles.trackResultsList}>
                    {trackResults.map((track) => (
                      <TrackResultRow key={track.trackId} track={track} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}