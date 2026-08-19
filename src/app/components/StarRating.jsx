// src/app/components/StarRating.jsx
'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import styles from './StarRating.module.css';

/**
 * Estrelas de 1 a 5. Se onChange for passado, fica interativo (hover +
 * clique). Sem onChange, funciona só como exibição (readOnly).
 */
export default function StarRating({ value = 0, onChange, size = 20, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const interactive = !readOnly && typeof onChange === 'function';
  const display = interactive && hover ? hover : value;

  return (
    <div
      className={styles.wrap}
      onMouseLeave={() => interactive && setHover(0)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label="Avaliação"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(n)}
          onClick={() => interactive && onChange(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            className={n <= display ? styles.filled : styles.empty}
            fill={n <= display ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}
