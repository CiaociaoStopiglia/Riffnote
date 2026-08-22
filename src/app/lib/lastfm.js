// src/app/lib/lastfm.js
import axios from 'axios';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// Diferente do Spotify, o Last.fm não precisa de OAuth — perfil é público
// por padrão, então só guardamos o username da pessoa.

export async function saveLastfmUsername(uid, username) {
  await updateDoc(doc(db, 'users', uid), {
    lastfmUsername: username,
    updatedAt: serverTimestamp(),
  });
}

export async function getLastfmUsername(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data().lastfmUsername || null : null;
}

export async function disconnectLastfm(uid) {
  await updateDoc(doc(db, 'users', uid), { lastfmUsername: null });
}

export async function fetchRecentTracks(username, limit = 25) {
  const { data } = await axios.get('/api/lastfm/recent-tracks', {
    params: { username, limit },
  });

  let items = data?.recenttracks?.track ?? [];
  if (items && !Array.isArray(items)) {
    items = [items];
  }

  return items.map((item, i) => ({
    id: `${item.mbid || item.name}-${item.date?.uts || `now-${i}`}`,
    title: item.name,
    artist: item.artist?.['#text'] || '',
    album: item.album?.['#text'] || '',
    artwork: item.image?.find((img) => img.size === 'extralarge')?.['#text'] || null,
    nowPlaying: item['@attr']?.nowplaying === 'true',
    playedAt: item.date?.uts ? Number(item.date.uts) * 1000 : null,
  }));
}
