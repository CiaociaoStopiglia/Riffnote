// src/app/components/StarRating.jsx
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

/**
 * Estrelas com suporte a meia-estrela.
 *
 * Interativo (com onChange): clica na metade esquerda de uma estrela pra
 * dar X.5, na metade direita pra dar X — granularidade de 0.5 em 0.5.
 *
 * Somente leitura (sem onChange): aceita qualquer valor decimal (ex: uma
 * média de 3.7) e preenche cada estrela PROPORCIONALMENTE, não só em
 * saltos de meia estrela — fica mais fiel pra mostrar médias reais.
 */
export default function StarRating({ value = 0, onChange, size = 20, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const interactive = !readOnly && typeof onChange === 'function';
  const display = interactive && hover ? hover : value;

  function getValueFromEvent(e, n) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    return isLeftHalf ? n - 0.5 : n;
  }

  return (
    <div
      className={styles.wrap}
      onMouseLeave={() => interactive && setHover(0)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="Avaliação"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        // Quanto dessa estrela específica está preenchido, de 0 a 1.
        const fill = Math.max(0, Math.min(1, display - (n - 1)));

        return (
          <button
            key={n}
            type="button"
            className={styles.starBtn}
            disabled={!interactive}
            onMouseMove={(e) => interactive && setHover(getValueFromEvent(e, n))}
            onClick={(e) => interactive && onChange(getValueFromEvent(e, n))}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          >
            <span className={styles.starIconWrap} style={{ width: size, height: size }}>
              <Star size={size} className={styles.empty} />
              <span className={styles.starFillClip} style={{ width: `${fill * 100}%` }}>
                <Star size={size} className={styles.filled} fill="currentColor" />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}