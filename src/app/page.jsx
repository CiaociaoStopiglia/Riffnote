'use client';

import { useEffect, useState } from 'react';
import { Input, Spin } from 'antd';
import toast, { Toaster } from 'react-hot-toast';
import {
  Disc3,
  Search,
  TrendingUp,
  Users,
  Clock,
  ChevronRight,
  X,
} from 'lucide-react';
import styles from './page.module.css';
import { fetchTopAlbums, searchAlbums, extractTopArtists } from './lib/musicApi';

// Atividade "social" ainda é mock — isso viria do seu próprio backend
// (avaliações e resenhas de usuários), não de uma API de catálogo de música.
const RECENT_ACTIVITY = [
  {
    id: 1,
    user: 'marina.ouve',
    action: 'avaliou',
    album: 'In Rainbows',
    hue: '#3fa796',
    time: '2 min',
    text: 'Cada faixa é um encaixe perfeito. "Weird Fishes" me pega toda vez.',
  },
  {
    id: 2,
    user: 'pedrovinil',
    action: 'resenhou',
    album: 'Currents',
    hue: '#2f8fd6',
    time: '18 min',
    text: 'Disco de transição que virou obra-prima. A produção envelheceu muito bem.',
  },
  {
    id: 3,
    user: 'lu.faixas',
    action: 'adicionou à lista',
    album: 'To Pimp a Butterfly',
    hue: '#8a5cf6',
    time: '41 min',
    text: 'Começando minha lista de "álbuns que mudam a forma como você ouve rap".',
  },
];

function RatingDots({ value, max = 5 }) {
  return (
    <div className={styles.rating}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`${styles.ratingDot} ${i < value ? styles.ratingDotFilled : ''}`}
        />
      ))}
    </div>
  );
}

function AlbumCard({ album }) {
  return (
    <div className={styles.albumCard}>
      <div className={styles.albumSleeve}>
        <div className={styles.albumDisc} />
        <div className={styles.albumCover}>
          {album.artwork ? (
            <img src={album.artwork} alt={`Capa de ${album.title}`} loading="lazy" />
          ) : (
            <div className={styles.albumCoverFallback}>{album.title}</div>
          )}
        </div>
      </div>
      <div className={styles.albumInfo}>
        <div className={styles.albumTitle}>{album.title}</div>
        <div className={styles.albumArtist}>{album.artist}</div>
        <RatingDots value={album.rating} />
      </div>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const [searchResults, setSearchResults] = useState(null); // null = sem busca ativa
  const [searching, setSearching] = useState(false);

  // Carrega o chart oficial da Apple Music assim que a página abre.
  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      setLoadingTrending(true);
      try {
        const albums = await fetchTopAlbums({ limit: 12 });
        if (cancelled) return;
        setTrendingAlbums(albums);
        setTopArtists(extractTopArtists(albums, 6));
      } catch (err) {
        if (cancelled) return;
        toast.error('Não consegui carregar os álbuns em alta agora.');
      } finally {
        if (!cancelled) setLoadingTrending(false);
      }
    }

    loadTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = async () => {
    const term = query.trim();
    if (!term) {
      toast.error('Digite o nome de um álbum ou artista.');
      return;
    }

    setSearching(true);
    try {
      const results = await searchAlbums(term, { limit: 12 });
      if (results.length === 0) {
        toast(`Nada encontrado para "${term}".`);
      }
      setSearchResults(results);
    } catch (err) {
      toast.error('Não consegui completar a busca. Tenta de novo.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setQuery('');
  };

  const showingSearch = searchResults !== null;

  return (
    <div className={styles.page}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1c1920',
            color: '#f4efe6',
            border: '1px solid #322c36',
            fontFamily: 'Space Grotesk, sans-serif',
          },
        }}
      />

      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.logo}>
          <Disc3 size={22} className={styles.logoIcon} />
          Riffnote
        </div>
        <nav className={styles.navLinks}>
          <a href="#">Álbuns</a>
          <a href="#">Artistas</a>
          <a href="#">Listas</a>
          <a href="#">Diário</a>
        </nav>
        <div className={styles.navActions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => toast('Login chega na próxima versão.')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => toast('Cadastro chega na próxima versão.')}
          >
            Criar conta
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.eyebrow}>seu diário de escuta</span>
        <h1 className={styles.heroTitle}>
          Toda música que você já ouviu, <em>guardada e avaliada.</em>
        </h1>
        <p className={styles.heroSub}>
          Registre álbuns, dê notas, escreva resenhas e monte listas — como um
          diário de cinema, mas para o que toca no seu fone.
        </p>

        <div className={styles.waveform} aria-hidden="true">
          {[18, 32, 14, 40, 22, 36, 12, 28, 20, 38, 16, 30].map((h, i) => (
            <span
              key={i}
              style={{ '--h': `${h}px`, animationDelay: `${i * 0.07}s` }}
            />
          ))}
        </div>

        <div className={styles.searchWrap}>
          <Input
            size="large"
            placeholder="Busque um álbum ou artista…"
            prefix={<Search size={18} color="#6f6860" />}
            suffix={searching ? <Spin size="small" /> : null}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
          />
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>340k</span>
            <span className={styles.heroStatLabel}>álbuns</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>1.2M</span>
            <span className={styles.heroStatLabel}>avaliações</span>
          </div>
          <div className={styles.heroStat}>
            <span className={styles.heroStatNum}>58k</span>
            <span className={styles.heroStatLabel}>ouvintes</span>
          </div>
        </div>
      </section>

      {/* Em alta / Resultados de busca */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={20} />
            {showingSearch ? `Resultados para "${query}"` : 'Em alta essa semana'}
          </h2>
          {showingSearch ? (
            <button type="button" className={styles.sectionLink} onClick={clearSearch}>
              limpar busca <X size={14} />
            </button>
          ) : (
            <a href="#" className={styles.sectionLink}>
              ver tudo <ChevronRight size={14} />
            </a>
          )}
        </div>

        {loadingTrending && !showingSearch ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando o chart da Apple Music…</span>
          </div>
        ) : (
          <div className={styles.albumGrid}>
            {(showingSearch ? searchResults : trendingAlbums).map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* Artistas */}
      {!showingSearch && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Users size={20} />
              Artistas em destaque
            </h2>
            <a href="#" className={styles.sectionLink}>
              ver tudo <ChevronRight size={14} />
            </a>
          </div>
          <div className={styles.artistRow}>
            {topArtists.map((artist) => (
              <div key={artist.name}>
                <div className={styles.artistAvatarRing}>
                  <div className={styles.artistAvatar}>
                    {artist.artwork ? (
                      <img src={artist.artwork} alt={artist.name} />
                    ) : (
                      artist.name.charAt(0)
                    )}
                  </div>
                </div>
                <div className={styles.artistName}>{artist.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Atividade recente */}
      {!showingSearch && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Clock size={20} />
              Atividade recente
            </h2>
            <a href="#" className={styles.sectionLink}>
              ver tudo <ChevronRight size={14} />
            </a>
          </div>
          <div className={styles.activityFeed}>
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className={styles.reviewCard}>
                <div
                  className={styles.reviewCover}
                  style={{ background: `linear-gradient(150deg, ${item.hue}, #14121a 130%)` }}
                />
                <div className={styles.reviewBody}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>{item.user}</span>
                    <span className={styles.reviewAction}>{item.action}</span>
                    <span className={styles.reviewAlbum}>{item.album}</span>
                    <span className={styles.reviewMeta}>{item.time}</span>
                  </div>
                  <p className={styles.reviewText}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <span>Riffnote © 2026</span>
        <span>feito por quem vive de fone no ouvido</span>
      </footer>
    </div>
  );
}