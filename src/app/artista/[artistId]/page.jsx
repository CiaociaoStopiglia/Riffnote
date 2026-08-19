// src/app/artista/[artistId]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { fetchArtistAlbums } from '../../lib/musicApi';
import AlbumCard from '../../components/AlbumCard';
import styles from './page.module.css';

export default function ArtistPage() {
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchArtistAlbums(artistId, { limit: 50 });
        if (cancelled) return;
        setArtist(data.artist);
        setAlbums(data.albums);
      } catch (err) {
        if (!cancelled) toast.error('Não consegui carregar esse artista.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (artistId) load();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/artistas" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pra artistas
      </Link>

      <div className={styles.header}>
        <span className={styles.eyebrow}>Artista</span>
        <h1 className={styles.name}>{artist?.name || 'Artista'}</h1>
        <div className={styles.count}>{albums.length} álbuns</div>
      </div>

      <div className={styles.section}>
        {albums.length === 0 ? (
          <div className={styles.emptyState}>
            Não encontrei álbuns pra esse artista no catálogo da Apple Music.
          </div>
        ) : (
          <div className={styles.grid}>
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
