// src/app/descobrir/page.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { ArrowLeft, X, Star, RotateCcw, Play, Pause, Loader2 } from 'lucide-react';
import { fetchTopAlbums, fetchNewReleases, searchTracks } from '../lib/musicApi';
import { listUserRatings } from '../lib/ratings';
import { recordDiscoverDecision } from '../lib/discover';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Charts de países diferentes têm álbuns bem diferentes entre si — em vez
// de só um país (limitado a ~100 álbuns), vamos girando por essa lista
// conforme o baralho vai acabando, pra parecer praticamente infinito.
const COUNTRIES = ['us', 'gb', 'br', 'jp', 'de', 'fr', 'kr', 'au', 'ca', 'mx', 'it', 'es', 'nl', 'se', 'in'];

export default function DescobrirPage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();

  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [liked, setLiked] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [exhausted, setExhausted] = useState(false); // true só se girar tudo e não achar mais nada novo

  const seenIdsRef = useRef(new Set());
  const ratedIdsRef = useRef(new Set());
  const countryIndexRef = useRef(0);
  const fetchingRef = useRef(false); // trava contra chamadas duplicadas

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;
    loadPool();
  }, [user]);

  function dedupeAndFilter(albums) {
    const fresh = [];
    for (const a of albums) {
      const id = String(a.id);
      if (seenIdsRef.current.has(id) || ratedIdsRef.current.has(id)) continue;
      seenIdsRef.current.add(id);
      fresh.push(a);
    }
    return fresh;
  }

  async function loadPool() {
    setLoading(true);
    setExhausted(false);
    seenIdsRef.current = new Set();
    countryIndexRef.current = 0;

    try {
      const rated = await listUserRatings(user.uid);
      ratedIdsRef.current = new Set(rated.map((r) => String(r.albumId)));

      const [top, recent] = await Promise.all([
        fetchTopAlbums({ country: COUNTRIES[0], limit: 100 }).catch(() => []),
        fetchNewReleases({ limit: 60 }).catch(() => []),
      ]);
      countryIndexRef.current = 1;

      const combined = dedupeAndFilter(shuffle([...top, ...recent]));
      setPool(combined);
      setIndex(0);
      setLiked(0);
      setSkipped(0);
    } catch (err) {
      toast.error('Não consegui carregar álbuns pra descobrir agora.');
    } finally {
      setLoading(false);
    }
  }

  // Busca mais álbuns de um próximo país do chart, sem o usuário perceber
  // nenhuma pausa — dispara sozinho quando faltam poucos cartões.
  async function fetchMore() {
    if (fetchingRef.current || countryIndexRef.current >= COUNTRIES.length) {
      if (countryIndexRef.current >= COUNTRIES.length) setExhausted(true);
      return;
    }

    fetchingRef.current = true;
    setFetchingMore(true);
    try {
      const country = COUNTRIES[countryIndexRef.current];
      countryIndexRef.current += 1;

      const albums = await fetchTopAlbums({ country, limit: 100 });
      const fresh = dedupeAndFilter(shuffle(albums));

      if (fresh.length > 0) {
        setPool((prev) => [...prev, ...fresh]);
      } else {
        // esse país não trouxe nada novo — tenta o próximo na próxima chamada
        fetchMore();
      }
    } catch (err) {
      // silencioso — só significa que essa "leva" falhou, tenta de novo depois
    } finally {
      fetchingRef.current = false;
      setFetchingMore(false);
    }
  }

  // Sempre que faltarem menos de 10 cartões, já pede mais em segundo plano.
  useEffect(() => {
    if (loading || pool.length === 0) return;
    const remaining = pool.length - index;
    if (remaining <= 10 && countryIndexRef.current < COUNTRIES.length) {
      fetchMore();
    }
  }, [index, pool.length, loading]);

  const current = pool[index];
  const outOfCards = index >= pool.length;
  const trulyFinished = !loading && outOfCards && exhausted;
  const waitingForMore = !loading && outOfCards && !exhausted;

  async function handleLike(album) {
    if (!album) return;
    setLiked((n) => n + 1);
    setIndex((i) => i + 1);
    try {
      await recordDiscoverDecision(user.uid, album, 'liked');
      toast.success(`Curtiu "${album.title}".`, { duration: 1500 });
    } catch (err) {
      toast.error('Não consegui salvar essa preferência.');
    }
  }

  function handleSkip() {
    if (!current) return;
    setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
    recordDiscoverDecision(user.uid, current, 'skipped').catch(() => {});
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
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Modo Descobrir</h1>
        <p className={styles.sub}>Arrasta pra direita pra curtir, pra esquerda pra pular.</p>
        {!loading && pool.length > 0 && (
          <div className={styles.counter}>
            {Math.min(index, pool.length)} de {pool.length} · {liked} curtidos · {skipped} pulados
          </div>
        )}
      </div>

      <div className={styles.stage}>
        {loading ? (
          <Spin size="large" />
        ) : trulyFinished ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Baralho zerado!</div>
            <p className={styles.emptyText}>
              Você curtiu {liked} e pulou {skipped} álbuns nessa rodada. Dá uma olhada na aba{' '}
              <strong>Descobertas</strong>, no seu perfil, pra ver as duas listas.
            </p>
            <button type="button" className={styles.restartBtn} onClick={loadPool}>
              <RotateCcw size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
              Buscar mais álbuns
            </button>
          </div>
        ) : waitingForMore ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>buscando mais álbuns…</span>
          </div>
        ) : (
          <Card key={current.id} album={current} onLike={() => handleLike(current)} onSkip={handleSkip} />
        )}
      </div>

      {!loading && !outOfCards && (
        <>
          <div className={styles.actions}>
            <button type="button" className={`${styles.actionBtn} ${styles.skipBtn}`} onClick={handleSkip}>
              <X size={24} />
            </button>
            <button type="button" className={`${styles.actionBtn} ${styles.likeBtn}`} onClick={() => handleLike(current)}>
              <Star size={26} fill="currentColor" />
            </button>
          </div>
          <p className={styles.hint}>
            {fetchingMore ? 'buscando mais álbuns em segundo plano…' : 'ou usa os botões, se preferir não arrastar'}
          </p>
        </>
      )}
    </div>
  );
}

function Card({ album, onLike, onSkip }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -20], [1, 0]);

  const audioRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Busca a prévia de 30s (cedida pela Apple/iTunes) assim que o cartão
  // aparece — sem isso, "descobrir" só pela capa não fazia sentido nenhum.
  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    setPlaying(false);
    setLoadingPreview(true);

    searchTracks(`${album.title} ${album.artist}`, { limit: 1 })
      .then((results) => {
        if (cancelled) return;
        setPreviewUrl(results[0]?.previewUrl || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
      audioRef.current?.pause();
    };
  }, [album.id]);

  function togglePlay(e) {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  function handleDragEnd(_, info) {
    if (info.offset.x > 120) {
      onLike();
    } else if (info.offset.x < -120) {
      onSkip();
    }
  }

  return (
    <div className={styles.cardWrap}>
      <motion.div
        className={styles.card}
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <motion.span className={styles.stampLike} style={{ opacity: likeOpacity }}>
          curtir
        </motion.span>
        <motion.span className={styles.stampSkip} style={{ opacity: skipOpacity }}>
          pular
        </motion.span>

        <div className={styles.coverWrap}>
          {album.artwork ? (
            <img src={album.artwork} alt={album.title} className={styles.cardCover} draggable={false} />
          ) : (
            <div className={styles.cardCover} />
          )}

          {previewUrl && (
            <audio
              ref={audioRef}
              src={previewUrl}
              onEnded={() => setPlaying(false)}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}

          <button
            type="button"
            className={styles.playBtn}
            onClick={togglePlay}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={loadingPreview || !previewUrl}
          >
            {loadingPreview ? (
              <Loader2 size={22} className={styles.spinIcon} />
            ) : !previewUrl ? (
              <span className={styles.noPreviewText}>sem prévia</span>
            ) : playing ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" />
            )}
          </button>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.cardTitle}>{album.title}</div>
          <div className={styles.cardArtist}>{album.artist}</div>
        </div>
      </motion.div>
    </div>
  );
}