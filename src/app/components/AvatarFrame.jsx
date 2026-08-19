// src/app/components/AvatarFrame.jsx
import styles from './AvatarFrame.module.css';

// Lista única — reaproveitada tanto pra renderizar a moldura quanto pro
// seletor visual na tela de configurações.
export const AVATAR_FRAMES = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'ring-gold', label: 'Anel dourado' },
  { id: 'ring-pulse', label: 'Pulso sonoro' },
  { id: 'ring-rainbow', label: 'Arco-íris' },
  { id: 'ring-vinyl', label: 'Vinil girando' },
  { id: 'ring-sparkle', label: 'Constelação' },
  { id: 'ring-neon', label: 'Néon' },
];

/**
 * Envolve o avatar (passado como children) com a moldura animada escolhida.
 * Se frame for 'none'/vazio, só devolve o children sem nenhum wrapper extra.
 */
export default function AvatarFrame({ frame, children }) {
  if (!frame || frame === 'none') {
    return children;
  }

  return (
    <div className={styles.wrap}>
      <span className={`${styles.ring} ${styles[frame] || ''}`} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
