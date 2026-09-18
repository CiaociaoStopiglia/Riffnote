// src/app/components/Pagination.jsx
import styles from './Pagination.module.css';

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-before-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <button
        type="button"
        className={styles.btn}
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      {buildPages(page, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className={styles.gap}>
            …
          </span>
        ) : (
          <button
            type="button"
            key={p}
            className={`${styles.btn} ${p === page ? styles.active : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={styles.btn}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}
