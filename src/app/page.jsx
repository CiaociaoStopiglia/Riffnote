// src/app/page.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Search,
  X,
  LogOut,
  Settings,
} from 'lucide-react';
import styles from './page.module.css';
import { fetchTopAlbums, searchAlbums, extractTopArtists, fillMissingArtwork } from './lib/musicApi';
import { useAuth } from './context/AuthContext';

// Three.js/WebGL só existe no navegador — desliga o SSR pra esse componente.
const VinylScene = dynamic(() => import('./components/VinylScene'), { ssr: false });

// Atividade "social" ainda é mock — isso viria do seu próprio backend
// (avaliações e resenhas de usuários), não de uma API de catálogo de música.
const RECENT_ACTIVITY = [
  {
    id: 1,
    user: 'marina.ouve',
    action: 'avaliou',
    album: 'In Rainbows',
    hue: '#c9432b',
    time: '2 min',
    text: 'Cada faixa é um encaixe perfeito. "Weird Fishes" me pega toda vez.',
  },
  {
    id: 2,
    user: 'pedrovinil',
    action: 'resenhou',
    album: 'Currents',
    hue: '#8a9a5b',
    time: '18 min',
    text: 'Disco de transição que virou obra-prima. A produção envelheceu muito bem.',
  },
  {
    id: 3,
    user: 'lu.faixas',
    action: 'adicionou à lista',
    album: 'To Pimp a Butterfly',
    hue: '#5c564a',
    time: '41 min',
    text: 'Começando minha lista de "álbuns que mudam a forma como você ouve rap".',
  },
];

const HERO_STEPS = [
  { num: '01', label: 'Registre', desc: 'Todo álbum que você ouvir, guardado no seu histórico.' },
  { num: '02', label: 'Avalie', desc: 'Nota de 1 a 5 e uma resenha, se quiser escrever.' },
  { num: '03', label: 'Compartilhe', desc: 'Listas, atividade recente, gente que ouve o que você ouve.' },
];

function RatingDots({ value, max = 5 }) {
  return (
    <div className={styles.rating}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`${styles.ratingDot} ${i < value ? styles.ratingDotFilled : ''}`} />
      ))}
    </div>
  );
}

function AlbumCard({ album }) {
  return (
    <Link href={`/album/${album.id}`} className={styles.albumCard}>
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
    </Link>
  );
}

export default function Home() {
  const { user, logOut } = useAuth();
  const pageRef = useRef(null);

  const [query, setQuery] = useState('');
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      setLoadingTrending(true);
      try {
        const albums = await fetchTopAlbums({ limit: 12 });
        if (cancelled) return;
        setTrendingAlbums(albums);
        const artists = extractTopArtists(albums, 6);
        fillMissingArtwork(artists).then((filled) => {
          if (!cancelled) setTopArtists(filled);
        });
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

  // Move o fundo bem sutilmente seguindo o mouse pela tela inteira.
  // Escuta direto na window (em vez de onMouseMove no div) pra não
  // depender do evento borbulhar através do Canvas do Three.js.
  useEffect(() => {
    function handleMouseMove(e) {
      if (!pageRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 a 1
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      pageRef.current.style.setProperty('--mx', x.toFixed(3));
      pageRef.current.style.setProperty('--my', y.toFixed(3));
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Riffnote" className={styles.logoIcon} />
          Riffnote
        </div>
        <nav className={styles.navLinks}>
          <Link href="/albuns">Álbuns</Link>
          <Link href="/artistas">Artistas</Link>
          <Link href="/usuarios">Pessoas</Link>
        </nav>
        <div className={styles.navActions}>
          {user ? (
            <>
              <Link href="/profile" className={styles.navAvatarLink}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Perfil'} className={styles.navAvatar} />
                ) : (
                  <span className={styles.navAvatarFallback}>
                    {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </Link>
              <Link href="/configuracoes" className={styles.ghostBtn} title="Configurações">
                <Settings size={16} />
              </Link>
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => {
                  logOut();
                  toast('Você saiu da conta.');
                }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.ghostBtn}>
                Entrar
              </Link>
              <Link href="/login?tab=signup" className={styles.primaryBtn}>
                Criar conta
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero — capa de disco + liner notes */}
      <section className={styles.hero}>
        <div className={styles.sleeve}>
          <VinylScene />
          <span className={styles.sleeveCatalog}>RN · 001 · SIDE A</span>
        </div>

        <div className={styles.linerNotes}>
          <span className={styles.eyebrow}>modelo RN-001 — diário de escuta pessoal</span>
          <h1 className={styles.heroTitle}>
            Toda música <em>guardada</em>. Toda nota <em>registrada</em>.
          </h1>
          <p className={styles.heroSub}>
            Riffnote é onde você anota o que ouviu — como um diário de cinema,
            só que pra o que toca no seu fone.
          </p>

          <div className={styles.searchWrap}>
            <Input
              size="large"
              placeholder="Busque um álbum ou artista…"
              prefix={<Search size={17} color="#5c564a" />}
              suffix={searching ? <Spin size="small" /> : null}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={handleSearch}
            />
          </div>

          <div className={styles.heroTracklist}>
            {HERO_STEPS.map((step) => (
              <div key={step.num} className={styles.heroTrack}>
                <span className={styles.heroTrackNum}>{step.num}</span>
                <span className={styles.heroTrackLabel}>{step.label}</span>
                <span className={styles.heroTrackDesc}>{step.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Em alta / Resultados de busca */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>{showingSearch ? 'busca' : 'chart Apple Music'}</span>
            <h2 className={styles.sectionTitle}>
              {showingSearch ? `"${query}"` : 'Em alta essa semana'}
            </h2>
          </div>
          {showingSearch && (
            <button type="button" className={styles.sectionLink} onClick={clearSearch}>
              limpar <X size={13} />
            </button>
          )}
        </div>

        {loadingTrending && !showingSearch ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando o chart…</span>
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
            <div>
              <span className={styles.sectionEyebrow}>a partir do chart</span>
              <h2 className={styles.sectionTitle}>Artistas em destaque</h2>
            </div>
            <Link href="/artistas" className={styles.sectionLink}>
              ver todos
            </Link>
          </div>
          <div className={styles.artistRow}>
            {topArtists.map((artist) => (
              <Link href={`/artista/${artist.artistId}`} key={artist.name} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className={styles.artistAvatarRing}>
                  <div className={styles.artistAvatar}>
                    {artist.artwork ? <img src={artist.artwork} alt={artist.name} /> : artist.name.charAt(0)}
                  </div>
                </div>
                <div className={styles.artistName}>{artist.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Atividade recente */}
      {!showingSearch && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>ao vivo</span>
              <h2 className={styles.sectionTitle}>Atividade recente</h2>
            </div>
          </div>
          <div className={styles.activityFeed}>
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className={styles.reviewCard}>
                <div
                  className={styles.reviewCover}
                  style={{ background: `linear-gradient(150deg, ${item.hue}, #0e0c0e 130%)` }}
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
        <span>RIFFNOTE © 2026</span>
        <span>feito por quem vive de fone no ouvido</span>
      </footer>
    </div>
  );
}