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
  { id: 'frame-basketball', label: 'Bola de basquete', isNew: true },
  { id: 'frame-propeller-hat', label: 'Chapéu de hélice', isNew: true },
  { id: 'frame-batman', label: 'Batman', isNew: true },
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
  'frame-basketball': 1.2,
  'frame-propeller-hat': 1.35,
  'frame-batman': 1.3,
};

// Silhueta de morcego, desenhada centrada em (0,0) — reaproveitada pelos
// morcegos que orbitam a moldura do Batman.
const BAT_PATH =
  'M0,-2 C-2,-5 -6,-6 -9,-4 C-7,-3 -6,-2 -6,-1 C-9,-1 -13,0 -14,3 ' +
  'C-11,3 -8,2 -6,1 C-7,3 -9,5 -11,6 C-7,6 -4,4 -2,2 C-1,3 1,3 2,2 ' +
  'C4,4 7,6 11,6 C9,5 7,3 6,1 C8,2 11,3 14,3 C13,0 9,-1 6,-1 ' +
  'C6,-2 7,-3 9,-4 C6,-6 2,-5 0,-2 Z';

function Bat({ angle, radius, duration, delay, reverse, flapDelay }) {
  return (
    <g transform={`rotate(${angle} 80 80)`}>
      <g
        className={styles.batOrbit}
        style={{
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        <g transform={`translate(80, ${80 - radius})`}>
          <g className={styles.batFlap} style={{ animationDelay: `${flapDelay}s` }}>
            <path d={BAT_PATH} fill="#0a0a0d" stroke="#c9d4f2" strokeWidth="0.6" strokeOpacity="0.55" />
          </g>
        </g>
      </g>
    </g>
  );
}

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

    case 'frame-basketball':
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <g className={styles.ballOrbit} style={{ transformOrigin: '80px 80px' }}>
            <g transform="translate(80,2)">
              <g className={styles.ballSpin}>
                <circle r="13" fill="#e8791d" stroke="#3a2313" strokeWidth="1.5" />
                <path d="M-13 0 H13 M0 -13 V13" stroke="#3a2313" strokeWidth="1.3" />
                <path d="M-9 -9 Q0 0 -9 9" stroke="#3a2313" strokeWidth="1.1" fill="none" />
                <path d="M9 -9 Q0 0 9 9" stroke="#3a2313" strokeWidth="1.1" fill="none" />
              </g>
            </g>
          </g>
        </svg>
      );

    case 'frame-propeller-hat': {
      const clipId = `beanie-clip-${reactId}`;
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <path d="M50 12 Q80 -20 110 12 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect x="50" y="-25" width="15" height="40" fill="#e0503c" />
            <rect x="65" y="-25" width="15" height="40" fill="#f2b46b" />
            <rect x="80" y="-25" width="15" height="40" fill="#3fa796" />
            <rect x="95" y="-25" width="15" height="40" fill="#8a9a5b" />
          </g>
          <path d="M50 12 Q80 -20 110 12" fill="none" stroke="#2a2a2a" strokeWidth="2" />
          <ellipse cx="80" cy="12" rx="32" ry="6" fill="none" stroke="#2a2a2a" strokeWidth="2" />
          <circle cx="80" cy="-19" r="3" fill="#f2c94c" stroke="#2a2a2a" strokeWidth="1" />
          <line x1="80" y1="-19" x2="80" y2="-30" stroke="#555" strokeWidth="2" />
          <g className={styles.propellerSpin} style={{ transformOrigin: '80px -30px' }}>
            <ellipse cx="80" cy="-30" rx="16" ry="4" fill="#e0503c" />
            <ellipse cx="80" cy="-30" rx="4" ry="16" fill="#3fa796" />
            <circle cx="80" cy="-30" r="3" fill="#f2c94c" />
          </g>
        </svg>
      );
    }

    case 'frame-batman': {
      const bats = [
        { angle: 15, radius: 74, duration: 6, delay: 0, reverse: false, flapDelay: 0 },
        { angle: 150, radius: 66, duration: 7.5, delay: 0.6, reverse: true, flapDelay: 0.15 },
        { angle: 260, radius: 78, duration: 5.2, delay: 1.1, reverse: false, flapDelay: 0.3 },
      ];
      return (
        <svg className={styles.decorFrame} viewBox="0 0 160 160" aria-hidden="true">
          <path d="M36 46 C14 14, -2 2, 6 0 C24 -3 52 22 58 40 Z" fill="#0a0a0d" stroke="#000" strokeWidth="1.5" />
          <path d="M124 46 C146 14, 162 2, 154 0 C136 -3 108 22 102 40 Z" fill="#0a0a0d" stroke="#000" strokeWidth="1.5" />
          <path d="M42 40 C28 18, 20 8, 26 6 C36 6 48 24 52 38 Z" fill="#1c1f2b" />
          <path d="M118 40 C132 18, 140 8, 134 6 C124 6 112 24 108 38 Z" fill="#1c1f2b" />
          <path d="M40 42 Q80 22 120 42" fill="none" stroke="#0a0a0d" strokeWidth="8" strokeLinecap="round" />
          {bats.map((bat, i) => (
            <Bat key={i} {...bat} />
          ))}
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
