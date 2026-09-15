// src/app/lib/discogs.js
import axios from 'axios';

/** Décadas de 1930 até a atual, no formato que a Discogs espera em "year" (ex: "1990-1999"). */
export const DECADES = (() => {
  const currentDecadeStart = Math.floor(new Date().getFullYear() / 10) * 10;
  const decades = [];
  for (let start = 1930; start <= currentDecadeStart; start += 10) {
    decades.push({ label: `${start}s`, value: `${start}-${start + 9}` });
  }
  return decades.reverse();
})();

/** Gêneros: taxonomia fixa e oficial da Discogs (não é uma lista livre). */
export const GENRES = [
  'Blues',
  'Brass & Military',
  "Children's",
  'Classical',
  'Electronic',
  'Folk, World, & Country',
  'Funk / Soul',
  'Hip Hop',
  'Jazz',
  'Latin',
  'Non-Music',
  'Pop',
  'Reggae',
  'Rock',
  'Stage & Screen',
].map((g) => ({ label: g, value: g }));

/** Styles (subgêneros) mais comuns — a Discogs tem centenas, aqui é uma seleção curada. */
export const STYLES = [
  'Alternative Rock',
  'Ambient',
  'Bebop',
  'Boom Bap',
  'Bossa Nova',
  'Britpop',
  'Classic Rock',
  'Conscious',
  'Cool Jazz',
  'Country',
  'Dancehall',
  'Disco',
  'Downtempo',
  'Drum n Bass',
  'Dub',
  'Emo',
  'Folk Rock',
  'Free Jazz',
  'Funk',
  'Fusion',
  'Garage Rock',
  'Grunge',
  'Hard Rock',
  'House',
  'IDM',
  'Indie Rock',
  'Industrial',
  'MPB',
  'Neo Soul',
  'Post-Punk',
  'Prog Rock',
  'Psychedelic Rock',
  'Punk',
  'Reggaeton',
  'Rhythm & Blues',
  'Roots Reggae',
  'Salsa',
  'Shoegaze',
  'Ska',
  'Smooth Jazz',
  'Soul',
  'Soundtrack',
  'Swing',
  'Synth-pop',
  'Techno',
  'Trance',
  'Trap',
].sort().map((s) => ({ label: s, value: s }));

/** Países no vocabulário da Discogs (abreviações pra US/UK, nomes completos pro resto). */
export const COUNTRIES = [
  ['Alemanha', 'Germany'],
  ['Argentina', 'Argentina'],
  ['Austrália', 'Australia'],
  ['Áustria', 'Austria'],
  ['Bélgica', 'Belgium'],
  ['Brasil', 'Brazil'],
  ['Canadá', 'Canada'],
  ['Chile', 'Chile'],
  ['Colômbia', 'Colombia'],
  ['Coreia do Sul', 'South Korea'],
  ['Dinamarca', 'Denmark'],
  ['Espanha', 'Spain'],
  ['Estados Unidos', 'US'],
  ['Europa (geral)', 'Europe'],
  ['Finlândia', 'Finland'],
  ['França', 'France'],
  ['Grécia', 'Greece'],
  ['Holanda', 'Netherlands'],
  ['Hungria', 'Hungary'],
  ['Índia', 'India'],
  ['Irlanda', 'Ireland'],
  ['Itália', 'Italy'],
  ['Japão', 'Japan'],
  ['México', 'Mexico'],
  ['Noruega', 'Norway'],
  ['Nova Zelândia', 'New Zealand'],
  ['Polônia', 'Poland'],
  ['Portugal', 'Portugal'],
  ['Reino Unido', 'UK'],
  ['República Tcheca', 'Czech Republic'],
  ['Rússia', 'Russia'],
  ['África do Sul', 'South Africa'],
  ['Suécia', 'Sweden'],
  ['Suíça', 'Switzerland'],
  ['Turquia', 'Turkey'],
  ['Worldwide (lançamento global)', 'Worldwide'],
].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([label, value]) => ({ label, value }));

/**
 * Busca álbuns filtrados na Discogs (década, gênero, país, style) + busca
 * livre opcional dentro do recorte. Devolve até `perPage` resultados
 * ordenados por popularidade real da comunidade Discogs.
 */
export async function searchDiscogsAlbums({ decade, genre, style, country, q, page = 1, perPage = 100 } = {}) {
  const { data } = await axios.get('/api/discogs-search', {
    params: { decade, genre, style, country, q, page, per_page: perPage },
  });

  return data;
}
