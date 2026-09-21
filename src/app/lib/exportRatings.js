// src/app/lib/exportRatings.js

function ratingDate(item) {
  const seconds = item.createdAt?.seconds || item.updatedAt?.seconds;
  return seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : '';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function download(filename, content, mime) {
  // BOM no CSV pra o Excel abrir acentos corretamente
  const blob = new Blob([mime === 'text/csv' ? '﻿' + content : content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRatingsCsv(albums) {
  const header = ['Álbum', 'Artista', 'Nota', 'Data', 'Tags', 'Resenha'];
  const rows = albums.map((a) =>
    [a.albumTitle, a.albumArtist, a.rating, ratingDate(a), (a.tags || []).join('; '), a.review].map(csvCell).join(',')
  );
  download('riffnote-avaliacoes.csv', [header.map(csvCell).join(','), ...rows].join('\n'), 'text/csv');
}

// Markdown pronto pra colar em blog/newsletter: maiores notas primeiro, resenhas como citação.
export function exportRatingsMarkdown(albums) {
  const sorted = [...albums].sort((a, b) => b.rating - a.rating);
  const lines = ['# Minhas avaliações', ''];

  for (const a of sorted) {
    lines.push(`## ${a.albumTitle} — ${a.albumArtist}`);
    lines.push(`**Nota:** ${a.rating}/5${ratingDate(a) ? ` · ${ratingDate(a)}` : ''}`);
    if (a.tags?.length) lines.push(`**Tags:** ${a.tags.join(', ')}`);
    if (a.review) lines.push('', ...a.review.split('\n').map((l) => `> ${l}`));
    lines.push('');
  }

  download('riffnote-avaliacoes.md', lines.join('\n'), 'text/markdown');
}
