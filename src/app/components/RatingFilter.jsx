// src/app/components/RatingFilter.jsx
'use client';

import { Star } from 'lucide-react';
import styles from './RatingFilter.module.css';

const RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

// Chips de filtro por nota. `value` é null (todos) ou a nota exata selecionada.
// Mostra a contagem de álbuns de cada nota e esmaece as que estão vazias.
export default function RatingFilter({ albums, value, onChange }) {
  const counts = new Map();
  for (const item of albums) {
    counts.set(item.rating, (counts.get(item.rating) || 0) + 1);
  }

  return (
    <div className={styles.filter} role="group" aria-label="Filtrar por nota">
      <button
        type="button"
        className={`${styles.chip} ${value === null ? styles.chipActive : ''}`}
        onClick={() => onChange(null)}
      >
        Todos <span className={styles.count}>{albums.length}</span>
      </button>
      {RATINGS.map((rating) => {
        const count = counts.get(rating) || 0;
        return (
          <button
            key={rating}
            type="button"
            className={`${styles.chip} ${value === rating ? styles.chipActive : ''}`}
            onClick={() => onChange(value === rating ? null : rating)}
            disabled={count === 0 && value !== rating}
          >
            <Star size={12} fill="currentColor" /> {rating}
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
