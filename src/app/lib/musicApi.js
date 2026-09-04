// src/app/lib/musicApi.js
import axios from 'axios';

// Chamamos nossas próprias rotas em /api/*, que fazem a ponte com a Apple/iTunes
// no servidor. Isso evita bloqueio de CORS, que acontece quando o navegador
// tenta chamar esses domínios da Apple diretamente.

function fakeRatingFromId(id) {
    const sum = String(id)
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (sum % 5) + 1;
}

function upscaleArtwork(url, size = 400) {
    if (!url) return null;
    return url.replace(/\/\d+x\d+bb\.(jpg|png)/, `/${size}x${size}bb.$1`);
}

/**
 * Busca o chart oficial "mais tocados" da Apple Music (por país).
 * Usado na seção "Em alta essa semana" / "Mais ouvidos".
 */
export async function fetchTopAlbums({ country = 'us', limit = 12 } = {}) {
    const { data } = await axios.get('/api/top-albums', {
        params: { country, limit },
    });

    const entries = data?.feed?.results ?? [];

    return entries.map((entry) => ({
        id: entry.id,
        title: entry.name,
        artist: entry.artistName,
        artistId: entry.artistId || null,
        artwork: upscaleArtwork(entry.artworkUrl100),
        rating: fakeRatingFromId(entry.id),
        url: entry.url,
        genre: entry.genres?.[0]?.name || null,
        releaseDate: entry.releaseDate || null,
    }));
}

/**
 * Lançamentos recentes ("descobertas da semana").
 */
export async function fetchNewReleases({ country = 'us', limit = 20 } = {}) {
    const { data } = await axios.get('/api/new-releases', {
        params: { country, limit },
    });

    const entries = data?.feed?.results ?? [];

    return entries.map((entry) => ({
        id: entry.id,
        title: entry.name,
        artist: entry.artistName,
        artistId: entry.artistId || null,
        artwork: upscaleArtwork(entry.artworkUrl100),
        rating: fakeRatingFromId(entry.id),
        url: entry.url,
        genre: entry.genres?.[0]?.name || null,
        releaseDate: entry.releaseDate || null,
    }));
}

/**
 * Busca álbuns por termo livre (nome de álbum, artista, etc).
 * Agora também traz genre e releaseDate — necessários pra Busca Avançada
 * filtrar por gênero/década.
 */
export async function searchAlbums(term, { limit = 12 } = {}) {
    const { data } = await axios.get('/api/search-albums', {
        params: { term, limit },
    });

    return (data?.results ?? []).map((item) => ({
        id: item.collectionId,
        title: item.collectionName,
        artist: item.artistName,
        artistId: item.artistId || null,
        artwork: upscaleArtwork(item.artworkUrl100),
        rating: fakeRatingFromId(item.collectionId),
        url: item.collectionViewUrl,
        genre: item.primaryGenreName || null,
        releaseDate: item.releaseDate || null,
    }));
}

/**
 * Busca por MÚSICA (não álbum) — devolve a faixa junto com o álbum a que
 * ela pertence, já que não temos uma página própria por faixa; clicar
 * num resultado leva pro álbum inteiro.
 */
export async function searchTracks(term, { limit = 12 } = {}) {
    const { data } = await axios.get('/api/search-albums', {
        params: { term, limit, entity: 'song' },
    });

    return (data?.results ?? [])
        .filter((item) => item.wrapperType === 'track' && item.collectionId)
        .map((item) => ({
            trackId: item.trackId,
            trackTitle: item.trackName,
            trackNumber: item.trackNumber || null,
            albumId: item.collectionId,
            albumTitle: item.collectionName,
            artist: item.artistName,
            artwork: upscaleArtwork(item.artworkUrl100),
            previewUrl: item.previewUrl || null,
        }));
}

/**
 * Busca artistas por nome.
 */
export async function searchArtists(term, { limit = 16 } = {}) {
    const { data } = await axios.get('/api/search-artists', {
        params: { term, limit },
    });

    const artists = (data?.results ?? []).map((item) => ({
        artistId: item.artistId,
        name: item.artistName,
        genre: item.primaryGenreName || null,
        artwork: null,
    }));

    return fillMissingArtwork(artists);
}

/**
 * Busca a discografia (álbuns) de um artista pelo artistId.
 */
export async function fetchArtistAlbums(artistId, { limit = 50 } = {}) {
    const { data } = await axios.get('/api/artist-albums', {
        params: { artistId, limit },
    });

    const results = data?.results ?? [];
    const artistInfo = results.find((item) => item.wrapperType === 'artist');
    const albums = results
        .filter((item) => item.wrapperType === 'collection')
        .map((item) => ({
            id: item.collectionId,
            title: item.collectionName,
            artist: item.artistName,
            artistId: item.artistId,
            artwork: upscaleArtwork(item.artworkUrl100),
            releaseDate: item.releaseDate || null,
            rating: fakeRatingFromId(item.collectionId),
        }));

    return {
        artist: artistInfo ? { artistId: artistInfo.artistId, name: artistInfo.artistName } : null,
        albums,
    };
}

export async function fetchAlbumFull(collectionId) {
    const { data } = await axios.get('/api/album-tracks', {
        params: { collectionId },
    });

    const results = data?.results ?? [];
    const collectionInfo = results.find((item) => item.wrapperType === 'collection');

    const album = collectionInfo
        ? {
              id: collectionInfo.collectionId,
              title: collectionInfo.collectionName,
              artist: collectionInfo.artistName,
              artistId: collectionInfo.artistId || null,
              artwork: upscaleArtwork(collectionInfo.artworkUrl100, 600),
              genre: collectionInfo.primaryGenreName || null,
              releaseDate: collectionInfo.releaseDate || null,
              trackCount: collectionInfo.trackCount || null,
          }
        : null;

    const tracks = results
        .filter((item) => item.wrapperType === 'track')
        .map((track) => ({
            id: track.trackId,
            number: track.trackNumber,
            title: track.trackName,
            durationMs: track.trackTimeMillis,
            previewUrl: track.previewUrl ?? null,
        }));

    return { album, tracks };
}

export async function fetchAlbumTracks(collectionId) {
    const { data } = await axios.get('/api/album-tracks', {
        params: { collectionId },
    });

    const results = data?.results ?? [];

    return results
        .filter((item) => item.wrapperType === 'track')
        .map((track) => ({
            id: track.trackId,
            number: track.trackNumber,
            title: track.trackName,
            durationMs: track.trackTimeMillis,
            previewUrl: track.previewUrl ?? null,
        }));
}

/**
 * Busca a foto REAL do artista na Deezer (tem foto de verdade, diferente
 * da API do iTunes que só tem capa de álbum). Retorna null se não achar
 * um artista com esse nome na Deezer.
 */
export async function fetchArtistPhoto(name) {
    try {
        const { data } = await axios.get('/api/artist-photo', { params: { name } });
        const artist = data?.data?.[0];
        return artist?.picture_big || artist?.picture_medium || null;
    } catch (err) {
        return null;
    }
}

/**
 * Pra todo artista sem imagem: tenta a foto real na Deezer primeiro;
 * se não achar, cai pra capa do álbum mais relevante no iTunes.
 */
export async function fillMissingArtwork(artists) {
    return Promise.all(
        artists.map(async (artist) => {
            if (artist.artwork) return artist;

            const photo = await fetchArtistPhoto(artist.name);
            if (photo) return { ...artist, artwork: photo };

            try {
                const { albums } = await fetchArtistAlbums(artist.artistId, { limit: 1 });
                return { ...artist, artwork: albums[0]?.artwork || null };
            } catch (err) {
                return artist;
            }
        }),
    );
}

export function extractTopArtists(albums, limit = 6) {
    const seen = new Map();

    for (const album of albums) {
        if (!seen.has(album.artist)) {
            seen.set(album.artist, {
                name: album.artist,
                artistId: album.artistId,
                artwork: album.artwork,
            });
        }
    }

    return Array.from(seen.values()).slice(0, limit);
}
