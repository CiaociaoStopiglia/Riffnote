// src/app/lib/affinity.js

export const MIN_SHARED_ALBUMS = 3;

/**
 * Afinidade musical entre duas pessoas, a partir dos álbuns que as duas avaliaram.
 * Cada álbum em comum vale 100% se a nota é igual e cai 40 pontos por estrela de
 * diferença (1 estrela de distância = 60%, 2.5 ou mais = 0%).
 *
 * `score` é o percentual encolhido pelo tamanho da amostra — serve só pra ordenar
 * rankings, pra 3 álbuns iguais não superarem 40 álbuns quase iguais.
 * Retorna null quando há poucos álbuns em comum pra dizer algo.
 */
export function computeAffinity(mine, theirs) {
  const theirsById = new Map(theirs.map((a) => [a.albumId, a]));
  const shared = [];

  for (const a of mine) {
    const b = theirsById.get(a.albumId);
    if (b) shared.push({ ...a, myRating: a.rating, theirRating: b.rating, diff: Math.abs(a.rating - b.rating) });
  }

  if (shared.length < MIN_SHARED_ALBUMS) return null;

  const avg = shared.reduce((s, x) => s + Math.max(0, 1 - x.diff / 2.5), 0) / shared.length;
  const sorted = [...shared].sort((a, b) => a.diff - b.diff);

  return {
    percent: Math.round(avg * 100),
    score: avg * (shared.length / (shared.length + 3)),
    sharedCount: shared.length,
    agree: sorted.filter((x) => x.diff === 0).sort((a, b) => b.myRating - a.myRating).slice(0, 3),
    disagree: sorted.slice(-3).reverse().filter((x) => x.diff >= 1),
  };
}

export function affinityLabel(percent) {
  if (percent >= 90) return 'Almas gêmeas musicais';
  if (percent >= 75) return 'Gosto muito parecido';
  if (percent >= 55) return 'Bastante em comum';
  if (percent >= 35) return 'Gostos diferentes';
  return 'Polos opostos';
}
