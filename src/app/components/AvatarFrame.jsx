// src/app/components/AvatarFrame.jsx
import { useId } from 'react';
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
  { id: 'ring-ice', label: 'Gelo', isNew: true },
  { id: 'ring-volcano', label: 'Vulcão', isNew: true },
  { id: 'ring-forest', label: 'Floresta', isNew: true },
  { id: 'ring-aurora', label: 'Aurora', isNew: true },
  { id: 'ring-solar', label: 'Solar', isNew: true },
  { id: 'ring-spider', label: 'Aracnídeo', isNew: true },
  { id: 'ring-candy', label: 'Candy', isNew: true },
  { id: 'frame-ears', label: 'Orelhas de gato', isNew: true },
  { id: 'frame-eyes', label: 'Dois olhos espiando', isNew: true },
  { id: 'frame-crab', label: 'Garras de caranguejo', isNew: true },
  { id: 'frame-watermelon', label: 'Melancia', isNew: true },
  { id: 'frame-flowers', label: 'Flores', isNew: true },
  { id: 'frame-greenring', label: 'Anel de energia verde', isNew: true },
];

// As molduras decorativas (bichinhos, frutas...) foram desenhadas pensando
// numa foto menor, centralizada num viewBox de 160x160 (pra sobrar espaço
// pra orelha, garra, pétala...). A FOTO fica sempre no tamanho de sempre —
// quem cresce é a camada da moldura, pra fora. Esses valores são ajustados
// à mão (nem sempre a proporção "matemática" do desenho original — ficava
// grande e desproporcional demais na prática).
const DECORATIVE_FRAME_ENLARGE = {
  'frame-ears': 1.2,
  'frame-eyes': 1.2,
  'frame-crab': 1.3,
  'frame-watermelon': 1.32,
  'frame-flowers': 1.3,
  'frame-greenring': 1.4,
};

function Flower({ x, y, color, delay }) {
  return (
    <g className={styles.flowerPulse} style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${delay}s` }}>
      <g transform={`translate(${x},${y})`}>
        <circle r="4" fill="#f6c445" />
        <g fill={color}>
          <ellipse rx="5" ry="8" transform="translate(0,-9)" />
          <ellipse rx="5" ry="8" transform="rotate(72) translate(0,-9)" />
          <ellipse rx="5" ry="8" transform="rotate(144) translate(0,-9)" />
          <ellipse rx="5" ry="8" transform="rotate(216) translate(0,-9)" />
          <ellipse rx="5" ry="8" transform="rotate(288) translate(0,-9)" />
        </g>
      </g>
    </g>
  );
}

function DecorativeFrameSvg({ frame }) {
  const reactId = useId();

  switch (frame) {
    case 'frame-ears':
      return (
        <svg className={`${styles.decorFrame} ${styles.earsSway}`} viewBox="0 0 160 160" aria-hidden="true">
          <path d="M35 45 C20 20, 10 10, 15 8 C25 5, 45 25, 50 40 Z" fill="#e8944a" stroke="#c9762e" strokeWidth="2" />
          <path d="M125 45 C140 20, 150 10, 145 8 C135 5, 115 25, 110 40 Z" fill="#e8944a" stroke="#c9762e" strokeWidth="2" />
          <path d="M40 40 C30 22, 25 15, 30 13 C38 12, 48 28, 50 38 Z" fill="#f2b98a" />
          <path d="M120 40 C130 22, 135 15, 130 13 C122 12, 112 28, 110 38 Z" fill="#f2b98a" />
        </svg>
      );

    case 'frame-eyes':
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <g className={styles.eyeBlink} style={{ transformOrigin: '55px 18px' }}>
            <ellipse cx="55" cy="18" rx="15" ry="11" fill="#fff" stroke="#222" strokeWidth="1.5" />
            <circle cx="55" cy="18" r="5.5" fill="#222" />
          </g>
          <g className={`${styles.eyeBlink} ${styles.eyeDelay}`} style={{ transformOrigin: '105px 18px' }}>
            <ellipse cx="105" cy="18" rx="15" ry="11" fill="#fff" stroke="#222" strokeWidth="1.5" />
            <circle cx="105" cy="18" r="5.5" fill="#222" />
          </g>
        </svg>
      );

    case 'frame-crab':
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <g className={styles.clawTop} style={{ transformOrigin: '18px 80px' }}>
            <path d="M18 80 C0 65, -5 45, 8 40 C18 55, 22 68, 25 78 Z" fill="#e0503c" stroke="#a53324" strokeWidth="2" />
          </g>
          <g className={styles.clawBottom} style={{ transformOrigin: '18px 80px' }}>
            <path d="M18 80 C0 95, -5 112, 8 118 C18 105, 22 92, 25 82 Z" fill="#e0503c" stroke="#a53324" strokeWidth="2" />
          </g>
          <g className={styles.clawTop} style={{ transformOrigin: '142px 80px' }}>
            <path d="M142 80 C160 65, 165 45, 152 40 C142 55, 138 68, 135 78 Z" fill="#e0503c" stroke="#a53324" strokeWidth="2" />
          </g>
          <g className={styles.clawBottom} style={{ transformOrigin: '142px 80px' }}>
            <path d="M142 80 C160 95, 165 112, 152 118 C142 105, 138 92, 135 82 Z" fill="#e0503c" stroke="#a53324" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'frame-watermelon':
      return (
        <svg className={`${styles.decorFrame} ${styles.melonSpin}`} viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r="84" fill="none" stroke="#1f6b3a" strokeWidth="5" />
          <circle cx="80" cy="80" r="79" fill="none" stroke="#eafbe0" strokeWidth="3" />
          <circle cx="80" cy="80" r="73" fill="none" stroke="#e0364a" strokeWidth="5" />
          <g fill="#1a1a1a">
            <ellipse cx="80" cy="1" rx="3" ry="5" />
            <ellipse cx="130" cy="20" rx="3" ry="5" transform="rotate(45 130 20)" />
            <ellipse cx="159" cy="80" rx="3" ry="5" transform="rotate(90 159 80)" />
            <ellipse cx="130" cy="140" rx="3" ry="5" transform="rotate(135 130 140)" />
            <ellipse cx="80" cy="159" rx="3" ry="5" />
            <ellipse cx="30" cy="140" rx="3" ry="5" transform="rotate(45 30 140)" />
            <ellipse cx="1" cy="80" rx="3" ry="5" transform="rotate(90 1 80)" />
            <ellipse cx="30" cy="20" rx="3" ry="5" transform="rotate(135 30 20)" />
          </g>
        </svg>
      );

    case 'frame-flowers':
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <Flower x={80} y={12} color="#ff8fab" delay={0} />
          <Flower x={135} y={55} color="#c88bfa" delay={0.4} />
          <Flower x={135} y={115} color="#8fd3ff" delay={0.8} />
          <Flower x={80} y={148} color="#ff8fab" delay={1.2} />
          <Flower x={25} y={115} color="#c88bfa" delay={1.6} />
          <Flower x={25} y={55} color="#8fd3ff" delay={2} />
        </svg>
      );

    case 'frame-greenring': {
      const filterId = `avatar-glow-${reactId}`;
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            className={styles.ringGlow}
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#00ff66"
            strokeWidth="4"
            filter={`url(#${filterId})`}
          />
          <g className={styles.sparks}>
            <rect x="78" y="4" width="4" height="10" fill="#baffcf" />
            <rect x="78" y="146" width="4" height="10" fill="#baffcf" />
            <rect x="4" y="78" width="10" height="4" fill="#baffcf" />
            <rect x="146" y="78" width="10" height="4" fill="#baffcf" />
          </g>
        </svg>
      );
    }

    default:
      return null;
  }
}

/**
 * Envolve o avatar (passado como children) com a moldura animada escolhida.
 * Se frame for 'none'/vazio, só devolve o children sem nenhum wrapper extra.
 */
export default function AvatarFrame({ frame, children }) {
  if (!frame || frame === 'none') {
    return children;
  }

  const enlarge = DECORATIVE_FRAME_ENLARGE[frame];

  if (enlarge) {
    return (
      <div className={styles.wrap}>
        <div className={styles.decorFrameLayer} style={{ transform: `scale(${enlarge})` }}>
          <DecorativeFrameSvg frame={frame} />
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <span className={`${styles.ring} ${styles[frame] || ''}`} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
