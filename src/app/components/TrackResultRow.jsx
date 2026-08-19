// src/app/components/TrackResultRow.jsx
import Link from 'next/link';
import { Music2 } from 'lucide-react';
import styles from './TrackResultRow.module.css';

// track: { trackId, trackTitle, albumId, albumTitle, artist, artwork }
export default function TrackResultRow({ track }) {
  return (
    <Link href={`/album/${track.albumId}`} className={styles.row}>
      {track.artwork ? (
        <img src={track.artwork} alt={track.trackTitle} className={styles.cover} />
      ) : (
        <div className={styles.cover} />
      )}
      <div className={styles.info}>
        <div className={styles.title}>{track.trackTitle}</div>
        <div className={styles.meta}>
          {track.artist} · {track.albumTitle}
        </div>
      </div>
      <span className={styles.badge}>
        <Music2 size={12} /> faixa
      </span>
    </Link>
  );
}
