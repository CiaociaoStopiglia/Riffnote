// src/app/lastfm/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Music, Radio } from 'lucide-react';
import {
  getLastfmUsername,
  saveLastfmUsername,
  disconnectLastfm,
  fetchRecentTracks,
} from '../lib/lastfm';
import { searchTracks } from '../lib/musicApi';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';

export default function LastfmPage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();

  const [connectedUsername, setConnectedUsername] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [matching, setMatching] = useState(null);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const username = await getLastfmUsername(user.uid);
        if (!username) {
          setLoading(false);
          return;
        }
        setConnectedUsername(username);
        const recent = await fetchRecentTracks(username, 25);
        setTracks(recent);
      } catch (err) {
        toast.error('Não consegui carregar seu histórico do Last.fm.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  async function handleConnect() {
    const clean = usernameInput.trim();
    if (!clean) {
      toast.error('Digita seu username do Last.fm.');
      return;
    }

    setConnecting(true);
    try {
      // valida se o usuário existe antes de salvar
      const recent = await fetchRecentTracks(clean, 25);
      await saveLastfmUsername(user.uid, clean);
      setConnectedUsername(clean);
      setTracks(recent);
      toast.success('Last.fm conectado!');
      setTimeout(() => {
        router.back();
      }, 1200);
    } catch (err) {
      const message = err.response?.data?.error || 'Não consegui conectar. Confere o username.';
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!user) return;
    try {
      await disconnectLastfm(user.uid);
      setConnectedUsername(null);
      setTracks([]);
      toast.success('Last.fm desconectado.');
    } catch (err) {
      toast.error('Não consegui desconectar.');
    }
  }

  async function handleRate(track) {
    setMatching(track.id);
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
      setMatching(null);
    }
  }

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
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.header}>
        <Radio size={22} color="#d51007" />
        <h1 className={styles.title}>Last.fm</h1>
      </div>
      <p className={styles.sub}>
        {connectedUsername
          ? 'As últimas músicas que você ouviu de verdade — avalia direto no Riffnote.'
          : 'Conecta seu Last.fm pra ver e avaliar o que você andou ouvindo, em qualquer app de música.'}
      </p>

      {!connectedUsername ? (
        <div className={styles.connectState}>
          <div className={styles.connectCard}>
            <span className={styles.connectLabel}>Seu username do Last.fm</span>
            <div className={styles.connectRow}>
              <Input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onPressEnter={handleConnect}
                placeholder="ex: rj"
              />
              <button type="button" className={styles.connectBtn} onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
            <p className={styles.connectHint}>
              Não tem conta? Cria grátis em{' '}
              <a href="https://www.last.fm/join" target="_blank" rel="noopener noreferrer">last.fm/join</a>.
              Depois, no app do Spotify (ou qualquer player), vai em Configurações → Social →
              "Connect to Last.fm" pra registrar automaticamente o que você ouve.
            </p>
          </div>
        </div>
      ) : tracks.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhuma música recente encontrada. Ouve algo e volta aqui!
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {tracks.map((track) => (
              <div key={track.id} className={styles.row}>
                {track.artwork ? (
                  <img src={track.artwork} alt={track.title} className={styles.cover} />
                ) : (
                  <div className={styles.cover} />
                )}
                <div className={styles.info}>
                  <div className={styles.trackTitle}>
                    {track.title}
                    {track.nowPlaying && (
                      <span className={styles.nowPlayingBadge}>
                        <Music size={11} /> tocando agora
                      </span>
                    )}
                  </div>
                  <div className={styles.trackMeta}>{track.artist} · {track.album}</div>
                </div>
                <button
                  type="button"
                  className={styles.rateBtn}
                  onClick={() => handleRate(track)}
                  disabled={matching === track.id}
                >
                  {matching === track.id ? 'buscando…' : 'Avaliar'}
                </button>
              </div>
            ))}
          </div>

          <div className={styles.disconnectRow}>
            <button type="button" className={styles.disconnectBtn} onClick={handleDisconnect}>
              Desconectar Last.fm
            </button>
          </div>
        </>
      )}
    </div>
  );
}
