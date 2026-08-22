// src/app/page.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import {
  Search,
  X,
  LogOut,
  Settings,
  RefreshCw,
} from 'lucide-react';
import styles from './page.module.css';
import { fetchTopAlbums, searchAlbums, searchTracks, extractTopArtists, fillMissingArtwork } from './lib/musicApi';
import { useAuth } from './context/AuthContext';
import TrackResultRow from './components/TrackResultRow';
import AvatarFrame from './components/AvatarFrame';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { useRouter } from 'next/navigation';
import { getLastfmUsername, fetchRecentTracks } from './lib/lastfm';

// ScrollTrigger e SplitText tocam no DOM, então só registram no navegador
// (nunca no build/SSR).
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

// Three.js/WebGL só existe no navegador — desliga o SSR pra esse componente.
const VinylScene = dynamic(() => import('./components/VinylScene'), { ssr: false });

// Atividade "social" ainda é mock — isso viria do seu próprio backend
// (avaliações e resenhas de usuários), não de uma API de catálogo de música.
const RECENT_ACTIVITY = [
  {
    id: 1,
    user: 'Ferreirag4',
    avatar: 'https://a.ltrbxd.com/resized/avatar/upload/4/5/4/9/3/3/2/shard/avtr-0-220-0-220-crop.jpg?v=de3da1ddee', // cole aqui o link da foto dele
    action: 'avaliou',
    album: 'Queen II',
    hue: '#c9432b',
    time: '2 min',
    text: 'Cada faixa é um encaixe perfeito. "Father to Son" me pega toda vez.',
  },
  {
    id: 2,
    user: 'Supremeduck3',
    avatar: 'https://avatars.githubusercontent.com/u/195989606?v=4', // cole aqui o link da foto dele
    action: 'resenhou',
    album: 'Currents',
    hue: '#8a9a5b',
    time: '18 min',
    text: 'Disco de transição que virou obra-prima. A produção envelheceu muito bem.',
  },
  {
    id: 3,
    user: 'lillys',
    avatar: 'https://res.cloudinary.com/bmndos6m/image/upload/v1787101901/riffnote/avatars/QBClO5JlsEe8LWZIsbcmghbgK2x2/icb8awjdmdtfv0l5ocvo.jpg', // cole aqui o link da foto dela
    action: 'adicionou à lista',
    album: 'Collide With The Sky',
    hue: '#5c564a',
    time: '41 min',
    text: 'Começando minha lista de "álbuns que mudam a forma como você ouve Emo".',
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
      <motion.div
        className={styles.albumSleeve}
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      >
        <div className={styles.albumDisc} />
        <div className={styles.albumCover}>
          {album.artwork ? (
            <img src={album.artwork} alt={`Capa de ${album.title}`} loading="lazy" />
          ) : (
            <div className={styles.albumCoverFallback}>{album.title}</div>
          )}
        </div>
      </motion.div>
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
  const router = useRouter();

  const [lastfmUsername, setLastfmUsername] = useState(null);
  const [lastfmTracks, setLastfmTracks] = useState([]);
  const [loadingLastfm, setLoadingLastfm] = useState(false);
  const [refreshingLastfm, setRefreshingLastfm] = useState(false);
  const [matchingTrackId, setMatchingTrackId] = useState(null);
  const pageRef = useRef(null);
  const titleRef = useRef(null);
  const drawingRef = useRef(null);
  const statementRef = useRef(null);

  const [avatarFrame, setAvatarFrame] = useState('none');

  useEffect(() => {
    if (!user) {
      setAvatarFrame('none');
      return;
    }
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => setAvatarFrame(snap.exists() ? snap.data().avatarFrame || 'none' : 'none'))
      .catch(() => {});
  }, [user]);

  const [query, setQuery] = useState('');
  const [trendingAlbums, setTrendingAlbums] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const [searchResults, setSearchResults] = useState(null);
  const [trackResults, setTrackResults] = useState([]);
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
      toast.error('Digite o nome de um álbum, artista ou música.');
      return;
    }

    setSearching(true);
    try {
      const [albums, tracks] = await Promise.all([
        searchAlbums(term, { limit: 12 }),
        searchTracks(term, { limit: 6 }),
      ]);
      if (albums.length === 0 && tracks.length === 0) {
        toast(`Nada encontrado para "${term}".`);
      }
      setSearchResults(albums);
      setTrackResults(tracks);
    } catch (err) {
      toast.error('Não consegui completar a busca. Tenta de novo.');
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setTrackResults([]);
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

  // Busca as últimas músicas do Last.fm da pessoa, se ela tiver conectado.
  // Extraído como função própria pra poder chamar tanto no polling automático
  // quanto no clique manual do botão de atualizar.
  async function loadLastfmTracks(uid) {
    const username = await getLastfmUsername(uid);
    if (!username) {
      setLastfmUsername(null);
      setLastfmTracks([]);
      return;
    }
    setLastfmUsername(username);
    const recent = await fetchRecentTracks(username, 10);
    setLastfmTracks(recent);
  }

  useEffect(() => {
    if (!user) {
      setLastfmUsername(null);
      setLastfmTracks([]);
      return;
    }

    setLoadingLastfm(true);
    loadLastfmTracks(user.uid)
      .catch((err) => {
        console.error('Erro ao carregar faixas do Last.fm:', err);
      })
      .finally(() => setLoadingLastfm(false));

    // atualiza sozinho a cada 60s, sem precisar recarregar a página
    const interval = setInterval(() => {
      loadLastfmTracks(user.uid).catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, [user]);

  async function handleRefreshLastfm() {
    if (!user || refreshingLastfm) return;
    setRefreshingLastfm(true);
    try {
      await loadLastfmTracks(user.uid);
    } catch (err) {
      toast.error('Não consegui atualizar agora.');
    } finally {
      setRefreshingLastfm(false);
    }
  }

  async function handleRateLastfmTrack(track) {
    setMatchingTrackId(track.id);
    try {
      const results = await searchTracks(`${track.title} ${track.artist}`, { limit: 1 });
      if (results.length === 0) {
        toast.error('Não achei esse álbum no catálogo do Riffnote.');
        return;
      }
      router.push(`/album/${results[0].albumId}`);
    } catch (err) {
      toast.error('Não consegui buscar esse álbum.');
    } finally {
      setMatchingTrackId(null);
    }
  }

  // GSAP + SplitText: entrada do hero letra por letra, títulos de seção que
  // se revelam palavra por palavra ACOMPANHANDO o scroll (scrub — não é só
  // "aparece uma vez", o progresso da animação é o próprio progresso do
  // scroll), e um desenho de linha original que se traça sozinho.
  useEffect(() => {
    let titleSplit;
    const sectionSplits = [];
    let statementSplit;

    const ctx = gsap.context(() => {
      // --- Entrada do hero ---
      if (titleRef.current) {
        titleSplit = SplitText.create(titleRef.current, { type: 'chars' });
      }

      const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      heroTl.from('[data-reveal="sleeve"]', { opacity: 0, scale: 0.94, duration: 0.7 }, 0);
      heroTl.from('[data-reveal="eyebrow"]', { opacity: 0, y: 14, duration: 0.5 }, 0.1);
      if (titleSplit) {
        heroTl.from(
          titleSplit.chars,
          {
            opacity: 0,
            y: 36,
            rotateX: -70,
            filter: 'blur(6px)',
            transformPerspective: 500,
            duration: 0.65,
            stagger: 0.014,
          },
          '-=0.3'
        );
      }
      heroTl.from('[data-reveal="sub"]', { opacity: 0, y: 14, duration: 0.5 }, '-=0.4');
      heroTl.from('[data-reveal="search"]', { opacity: 0, y: 14, duration: 0.5 }, '-=0.3');
      heroTl.from('[data-reveal="track"]', { opacity: 0, y: 10, duration: 0.4, stagger: 0.08 }, '-=0.25');

      // --- Conteúdo de cada seção (fade + leve subida ao entrar na tela) ---
      gsap.utils.toArray('[data-reveal-section]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // --- Títulos de seção: palavra por palavra, PRESA ao scroll (scrub) ---
      gsap.utils.toArray('[data-split-title]').forEach((el) => {
        const split = SplitText.create(el, { type: 'words' });
        sectionSplits.push(split);
        gsap.from(split.words, {
          opacity: 0,
          y: 30,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: {
            trigger: el,
            start: 'top 92%',
            end: 'top 55%',
            scrub: 0.6,
          },
        });
      });

      // --- Desenho de linha do toca-discos: traça sozinho conforme rola ---
      if (drawingRef.current) {
        const drawEls = drawingRef.current.querySelectorAll('path, circle');
        drawEls.forEach((el) => {
          const length = el.getTotalLength();
          gsap.set(el, { strokeDasharray: length, strokeDashoffset: length });
        });
        gsap.to(drawEls, {
          strokeDashoffset: 0,
          ease: 'none',
          stagger: 0.18,
          scrollTrigger: {
            trigger: drawingRef.current,
            start: 'top 85%',
            end: 'bottom 35%',
            scrub: 1,
          },
        });
      }

      // --- Frase grande: acende palavra por palavra conforme você lê/rola ---
      if (statementRef.current) {
        statementSplit = SplitText.create(statementRef.current, { type: 'words' });
        gsap.from(statementSplit.words, {
          opacity: 0.1,
          filter: 'blur(3px)',
          ease: 'none',
          stagger: 0.4,
          scrollTrigger: {
            trigger: statementRef.current,
            start: 'top 78%',
            end: 'bottom 30%',
            scrub: 0.7,
          },
        });
      }
    }, pageRef);

    return () => {
      ctx.revert();
      titleSplit?.revert();
      sectionSplits.forEach((s) => s.revert());
      statementSplit?.revert();
    };
  }, [showingSearch]);

  return (
    <div className={styles.page} ref={pageRef}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.logo}>
          <img src="/icon.png" alt="Riffnote" className={styles.logoIcon} />
          Riffnote
        </div>
        <nav className={styles.navLinks}>
          <Link href="/albuns">Álbuns</Link>
          <Link href="/artistas">Artistas</Link>
          <Link href="/usuarios">Pessoas</Link>
          <Link href="/comunidade">Comunidade</Link>
        </nav>
        <div className={styles.navActions}>
          {user ? (
            <>
              <Link href="/profile" className={styles.navAvatarLink}>
                <AvatarFrame frame={avatarFrame}>
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'Perfil'} className={styles.navAvatar} />
                ) : (
                  <span className={styles.navAvatarFallback}>
                    {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                </AvatarFrame>
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
        <div className={styles.sleeve} data-reveal="sleeve">
          <VinylScene />
          <span className={styles.sleeveCatalog}>RN · 001 · SIDE A</span>
        </div>

        <div className={styles.linerNotes}>
          <span className={styles.eyebrow} data-reveal="eyebrow">modelo RN-001 — diário de escuta pessoal</span>
          <h1 className={styles.heroTitle} ref={titleRef}>
            Toda música <em>guardada</em>. Toda nota <em>registrada</em>.
          </h1>
          <p className={styles.heroSub} data-reveal="sub">
            Riffnote é onde você anota o que ouviu — como um diário de cinema,
            só que pra o que toca no seu fone.
          </p>

          <div className={styles.searchWrap} data-reveal="search">
            <Input
              size="large"
              placeholder="Busque um álbum, artista ou música…"
              prefix={<Search size={17} color="#5c564a" />}
              suffix={searching ? <Spin size="small" /> : null}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={handleSearch}
            />
          </div>

          <div className={styles.heroTracklist}>
            {HERO_STEPS.map((step) => (
              <div key={step.num} className={styles.heroTrack} data-reveal="track">
                <span className={styles.heroTrackNum}>{step.num}</span>
                <span className={styles.heroTrackLabel}>{step.label}</span>
                <span className={styles.heroTrackDesc}>{step.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que você andou ouvindo (Last.fm) — só aparece pra quem conectou */}
      {user && lastfmUsername && (
        <section className={styles.section} data-reveal-section>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>via Last.fm</span>
              <h2 className={styles.sectionTitle}>O que você andou ouvindo</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                className={styles.lastfmRefreshBtn}
                onClick={handleRefreshLastfm}
                disabled={refreshingLastfm}
                title="Atualizar agora"
              >
                <RefreshCw size={14} className={refreshingLastfm ? styles.spinning : ''} />
              </button>
              <Link href="/lastfm" className={styles.sectionLink}>
                gerenciar
              </Link>
            </div>
          </div>

          {loadingLastfm ? (
            <div className={styles.loadingRow}>
              <Spin /> <span>carregando…</span>
            </div>
          ) : lastfmTracks.length === 0 ? (
            <div className={styles.lastfmEmpty}>Nenhuma música recente encontrada.</div>
          ) : (
            <div className={styles.lastfmRowWrap}>
              <div className={styles.lastfmRow}>
                {lastfmTracks.map((track, i) => (
                  <motion.button
                    key={track.id}
                    type="button"
                    className={styles.lastfmCard}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleRateLastfmTrack(track)}
                    disabled={matchingTrackId === track.id}
                  >
                    <div className={styles.lastfmSleeve}>
                      <span className={styles.lastfmDisc} />
                      <div className={styles.lastfmCoverWrap}>
                        {track.artwork ? (
                          <img src={track.artwork} alt={track.title} />
                        ) : (
                          <div className={styles.lastfmCoverFallback} />
                        )}
                        {track.nowPlaying && (
                          <span className={styles.lastfmNowPlaying}>
                            <span className={styles.lastfmPulseDot} /> agora
                          </span>
                        )}
                        <div className={styles.lastfmRateOverlay}>
                          {matchingTrackId === track.id ? 'buscando…' : 'avaliar'}
                        </div>
                      </div>
                    </div>
                    <div className={styles.lastfmTrackTitle}>{track.title}</div>
                    <div className={styles.lastfmTrackArtist}>{track.artist}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Em alta / Resultados de busca */}
      <section className={styles.section} data-reveal-section>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>{showingSearch ? 'busca' : 'chart Apple Music'}</span>
            <h2 className={styles.sectionTitle} data-split-title>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={showingSearch ? `search-${query}` : 'trending'}
              className={styles.albumGrid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {(showingSearch ? searchResults : trendingAlbums).map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {showingSearch && trackResults.length > 0 && (
          <div className={styles.trackResultsBlock}>
            <span className={styles.trackResultsLabel}>Músicas</span>
            <div className={styles.trackResultsList}>
              {trackResults.map((track) => (
                <TrackResultRow key={track.trackId} track={track} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Artistas */}
      {!showingSearch && (
        <section className={styles.section} data-reveal-section>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>a partir do chart</span>
              <h2 className={styles.sectionTitle} data-split-title>Artistas em destaque</h2>
            </div>
            <Link href="/artistas" className={styles.sectionLink}>
              ver todos
            </Link>
          </div>
          <div className={styles.artistRow}>
            {topArtists.map((artist) => (
              <Link href={`/artista/${artist.artistId}`} key={artist.name} style={{ textDecoration: 'none', color: 'inherit' }}>
                <motion.div
                  className={styles.artistAvatarRing}
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                >
                  <div className={styles.artistAvatar}>
                    {artist.artwork ? <img src={artist.artwork} alt={artist.name} /> : artist.name.charAt(0)}
                  </div>
                </motion.div>
                <div className={styles.artistName}>{artist.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Frase grande — acende palavra por palavra conforme você rola */}
      <div className={styles.statementWrap}>
        <p className={styles.statement} ref={statementRef}>
          Não é só ouvir. É lembrar o que ouviu, quando ouviu, e o que sentiu na hora.
        </p>
      </div>

      {/* Atividade recente */}
      {!showingSearch && (
        <section className={styles.section} data-reveal-section>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>ao vivo</span>
              <h2 className={styles.sectionTitle} data-split-title>Atividade recente</h2>
            </div>
          </div>
          <div className={styles.activityFeed}>
            {RECENT_ACTIVITY.map((item) => (
              <div key={item.id} className={styles.reviewCard}>
                <div
                  className={styles.reviewAvatar}
                  style={{ borderColor: item.hue }}
                >
                  {item.avatar ? (
                    <img src={item.avatar} alt={item.user} className={styles.reviewAvatarImage} />
                  ) : (
                    <span
                      className={styles.reviewAvatarFallback}
                      style={{ background: `linear-gradient(150deg, ${item.hue}, #0e0c0e 130%)` }}
                    >
                      {item.user.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
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

      {/* Desenho de linha original — se traça sozinho conforme você rola.
          Fica por último de propósito: é um fechamento visual, não deve
          disputar atenção com busca/resultados. */}
      {!showingSearch && (
        <div className={styles.drawingSection}>
          <span className={styles.drawingLabel}>traçado à mão, sem clichê de IA</span>
          <svg
            ref={drawingRef}
            viewBox="0 0 400 220"
            className={styles.drawingSvg}
            fill="none"
            aria-hidden="true"
          >
            <circle cx="130" cy="110" r="95" className={styles.drawStroke} />
            <circle cx="130" cy="110" r="30" className={styles.drawStroke} />
            <circle cx="130" cy="110" r="4" className={styles.drawStroke} />
            <path d="M 320 40 L 165 100" className={styles.drawStrokeAccent} />
            <circle cx="320" cy="40" r="12" className={styles.drawStrokeAccent} />
            <path d="M 60 160 A 85 85 0 0 1 50 108" className={styles.drawStroke} />
          </svg>
        </div>
      )}

      <footer className={styles.footer}>
        <span>RIFFNOTE © 2026</span>
        <span>feito por quem vive de fone no ouvido</span>
      </footer>
    </div>
  );
}