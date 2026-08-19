// src/app/artistas/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, History, X } from 'lucide-react';
import {
  fetchTopAlbums,
  fetchNewReleases,
  extractTopArtists,
  searchArtists,
  fillMissingArtwork,
} from '../lib/musicApi';
import { getArtistHistory, addArtistToHistory, clearArtistHistory } from '../lib/searchHistory';
import styles from './page.module.css';

function ArtistCard({ artist, onVisit }) {
  return (
    <Link
      href={`/artista/${artist.artistId}`}
      className={styles.artistCard}
      onClick={() => onVisit?.(artist)}
    >
      <div className={styles.artistAvatar}>
        {artist.artwork ? (
          <img src={artist.artwork} alt={artist.name} />
        ) : (
          artist.name.charAt(0)
        )}
      </div>
      <div className={styles.artistName}>{artist.name}</div>
      {artist.genre && <div className={styles.artistGenre}>{artist.genre}</div>}
    </Link>
  );
}

export default function ArtistasPage() {
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(getArtistHistory());
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [topAlbums, newAlbums] = await Promise.all([
          fetchTopAlbums({ limit: 20 }),
          fetchNewReleases({ limit: 20 }).catch(() => []),
        ]);

        const combined = [...topAlbums, ...newAlbums].filter((a) => a.artistId);
        const artists = extractTopArtists(combined, 24);
        const artistsWithArtwork = await fillMissingArtwork(artists);
        setFeatured(artistsWithArtwork);
      } catch (err) {
        toast.error('Não consegui carregar os artistas em destaque.');
      } finally {
        setLoadingFeatured(false);
      }
    }

    load();
  }, []);

  async function handleSearch() {
    const term = query.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await searchArtists(term, { limit: 16 });
      if (results.length === 0) {
        toast(`Nenhum artista encontrado pra "${term}".`);
      }
      setSearchResults(results);
    } catch (err) {
      toast.error('Não consegui buscar artistas agora.');
    } finally {
      setSearching(false);
    }
  }

  function handleVisitArtist(artist) {
    setHistory(addArtistToHistory(artist));
  }

  function handleClearHistory() {
    setHistory(clearArtistHistory());
  }

  const showingSearch = searchResults !== null;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Artistas</h1>
        <p className={styles.pageSub}>
          Explore artistas em destaque ou busque por qualquer nome pra ver a discografia completa.
        </p>
      </div>

      <div className={styles.searchWrap}>
        <Input
          size="large"
          placeholder="Buscar um artista…"
          prefix={<Search size={16} color="#6f6860" />}
          suffix={searching ? <Spin size="small" /> : null}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
        />
      </div>

      {/* Histórico — só aparece se já tiver algo, e some quando uma busca está ativa */}
      {!showingSearch && history.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.sectionTitle}>
              <History size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              Seu histórico
            </div>
            <button type="button" className={styles.clearHistoryBtn} onClick={handleClearHistory}>
              <X size={12} /> limpar
            </button>
          </div>
          <div className={styles.artistGrid}>
            {history.map((artist) => (
              <ArtistCard key={artist.artistId} artist={artist} onVisit={handleVisitArtist} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          {showingSearch ? `Resultados para "${query}"` : 'Em destaque'}
        </div>

        {showingSearch ? (
          searchResults.length === 0 ? (
            <div className={styles.emptyState}>Nenhum artista encontrado.</div>
          ) : (
            <div className={styles.artistGrid}>
              {searchResults.map((artist) => (
                <ArtistCard key={artist.artistId} artist={artist} onVisit={handleVisitArtist} />
              ))}
            </div>
          )
        ) : loadingFeatured ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando artistas…</span>
          </div>
        ) : (
          <div className={styles.artistGrid}>
            {featured.map((artist) => (
              <ArtistCard key={artist.artistId} artist={artist} onVisit={handleVisitArtist} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}