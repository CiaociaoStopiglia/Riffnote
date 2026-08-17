import axios from 'axios';

// APIs públicas da Apple/iTunes — não exigem chave nem cadastro.
const CHARTS_BASE = 'https://rss.marketingtools.apple.com/api/v2';
const SEARCH_BASE = 'https://itunes.apple.com/search';

/**
 * Gera uma nota "estável" (1 a 5) a partir do id do álbum.
 * É só um placeholder visual até você ter um backend real de avaliações
 * (a API de música não tem conceito de nota de usuário).
 */
function fakeRatingFromId(id) {
  const sum = String(id)
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (sum % 5) + 1;
}

// A Apple entrega capas pequenas (100x100). Trocamos o tamanho na própria URL.
function upscaleArtwork(url, size = 400) {
  if (!url) return null;
  return url.replace(/\/\d+x\d+bb\.(jpg|png)/, `/${size}x${size}bb.$1`);
}

/**
 * Busca o chart oficial "mais tocados" da Apple Music (por país).
 * Usado na seção "Em alta essa semana".
 */
export async function fetchTopAlbums({ country = 'us', limit = 12 } = {}) {
  const { data } = await axios.get(
    `${CHARTS_BASE}/${country}/music/most-played/${limit}/albums.json`
  );

  const entries = data?.feed?.results ?? [];

  return entries.map((entry) => ({
    id: entry.id,
    title: entry.name,
    artist: entry.artistName,
    artwork: upscaleArtwork(entry.artworkUrl100),
    rating: fakeRatingFromId(entry.id),
    url: entry.url,
  }));
}

/**
 * Busca álbuns por termo livre (nome de álbum, artista, etc).
 * Usado na barra de busca do hero.
 */
export async function searchAlbums(term, { limit = 12 } = {}) {
  const { data } = await axios.get(SEARCH_BASE, {
    params: {
      term,
      entity: 'album',
      limit,
    },
  });

  return (data?.results ?? []).map((item) => ({
    id: item.collectionId,
    title: item.collectionName,
    artist: item.artistName,
    artwork: upscaleArtwork(item.artworkUrl100),
    rating: fakeRatingFromId(item.collectionId),
    url: item.collectionViewUrl,
  }));
}

/**
 * Deriva uma lista de "artistas em destaque" a partir de uma lista de álbuns,
 * removendo duplicatas. A API de charts não expõe um ranking de artistas
 * separado, então construímos a partir do chart de álbuns.
 */
export function extractTopArtists(albums, limit = 6) {
  const seen = new Map();

  for (const album of albums) {
    if (!seen.has(album.artist)) {
      seen.set(album.artist, {
        name: album.artist,
        artwork: album.artwork,
      });
    }
  }

  return Array.from(seen.values()).slice(0, limit);
}