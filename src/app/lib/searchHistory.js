// src/app/lib/searchHistory.js
const KEY = 'riffnote_artist_history';
const MAX = 12;

/**
 * Histórico local (no navegador) dos artistas que a pessoa clicou/visitou
 * na página de Artistas. Fica em localStorage — não precisa de login nem
 * de Firestore, funciona até pra quem não tem conta ainda.
 */

export function getArtistHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function addArtistToHistory(artist) {
  if (typeof window === 'undefined' || !artist?.artistId) return getArtistHistory();

  const current = getArtistHistory().filter((a) => a.artistId !== artist.artistId);
  const updated = [
    { artistId: artist.artistId, name: artist.name, artwork: artist.artwork || null },
    ...current,
  ].slice(0, MAX);

  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function clearArtistHistory() {
  if (typeof window === 'undefined') return [];
  localStorage.removeItem(KEY);
  return [];
}
