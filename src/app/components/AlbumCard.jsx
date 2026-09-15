// src/app/components/AlbumCard.jsx
import Link from 'next/link';
import { Spin } from 'antd';
import StarRating from './StarRating';
import styles from './AlbumCard.module.css';

/**
 * album: { id, title, artist, artwork }
 * average (opcional): nota média da comunidade, mostrada como estrelas + número
 * href (opcional): sobrescreve o destino padrão `/album/{id}`.
 * onClick (opcional): quando informado, o card não navega direto — dispara
 * essa função com o `album` (usado pra resolver resultados que vêm de fora
 * do catálogo iTunes, ex: filtro Discogs, pro álbum certo do Riffnote antes
 * de entrar na página, pra dar pra avaliar como qualquer outro disco).
 * loading (opcional): mostra um spinner sobre a capa (resolução em andamento).
 * badge (opcional): texto curto exibido no lugar das estrelas (ex: ano · país).
 */
export default function AlbumCard({ album, average, href, external, badge, onClick, loading }) {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  function handleClick(e) {
    if (onClick) {
      e.preventDefault();
      if (!loading) onClick(album);
    }
  }

  return (
    <Link
      href={onClick ? '#' : href || `/album/${album.id}`}
      className={styles.card}
      onClick={handleClick}
      {...linkProps}
    >
      <div className={styles.coverWrap}>
        {album.artwork ? (
          <img src={album.artwork} alt={album.title} className={styles.cover} loading="lazy" />
        ) : (
          <div className={styles.cover} />
        )}
        {loading && (
          <div className={styles.coverLoadingOverlay}>
            <Spin size="small" />
          </div>
        )}
      </div>
      <div className={styles.title}>{album.title}</div>
      <div className={styles.artist}>{album.artist}</div>
      {typeof average === 'number' && (
        <>
          <div className={styles.stars}>
            <StarRating value={average} readOnly size={13} />
          </div>
          <div className={styles.avgLabel}>{average.toFixed(1)}/5</div>
        </>
      )}
      {badge && <div className={styles.avgLabel}>{badge}</div>}
    </Link>
  );
}