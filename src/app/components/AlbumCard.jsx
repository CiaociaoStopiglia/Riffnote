// src/app/components/AlbumCard.jsx
import Link from 'next/link';
import StarRating from './StarRating';
import styles from './AlbumCard.module.css';

/**
 * album: { id, title, artist, artwork }
 * average (opcional): nota média da comunidade, mostrada como estrelas + número
 */
export default function AlbumCard({ album, average }) {
  return (
    <Link href={`/album/${album.id}`} className={styles.card}>
      {album.artwork ? (
        <img src={album.artwork} alt={album.title} className={styles.cover} loading="lazy" />
      ) : (
        <div className={styles.cover} />
      )}
      <div className={styles.title}>{album.title}</div>
      <div className={styles.artist}>{album.artist}</div>
      {typeof average === 'number' && (
        <>
          <div className={styles.stars}>
            <StarRating value={Math.round(average)} readOnly size={13} />
          </div>
          <div className={styles.avgLabel}>{average.toFixed(1)}/5</div>
        </>
      )}
    </Link>
  );
}
