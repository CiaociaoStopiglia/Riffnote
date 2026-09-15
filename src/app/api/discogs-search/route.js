// src/app/api/discogs-search/route.js
import { NextResponse } from 'next/server';

// A API do iTunes (usada no resto do site) não tem filtro nenhum por
// década/gênero/país — só busca por texto livre. Pra esses filtros de
// verdade a gente usa a Discogs, que tem facetas nativas (year, genre,
// country) e ordena por popularidade real da comunidade (campo "have").

export async function GET(request) {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'DISCOGS_TOKEN não configurado no servidor.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const decade = searchParams.get('decade'); // ex: "1990-1999"
  const genre = searchParams.get('genre');
  const style = searchParams.get('style');
  const country = searchParams.get('country');
  const q = searchParams.get('q');
  const page = searchParams.get('page') || '1';
  const perPage = Math.min(Number(searchParams.get('per_page')) || 100, 100);

  const discogsUrl = new URL('https://api.discogs.com/database/search');
  discogsUrl.searchParams.set('type', 'master');
  discogsUrl.searchParams.set('per_page', String(perPage));
  discogsUrl.searchParams.set('page', page);
  discogsUrl.searchParams.set('sort', 'have');
  discogsUrl.searchParams.set('sort_order', 'desc');
  if (decade) discogsUrl.searchParams.set('year', decade);
  if (genre) discogsUrl.searchParams.set('genre', genre);
  if (style) discogsUrl.searchParams.set('style', style);
  if (country) discogsUrl.searchParams.set('country', country);
  if (q) discogsUrl.searchParams.set('q', q);

  try {
    const res = await fetch(discogsUrl.toString(), {
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'Riffnote/1.0 +https://www.riffnote.com.br',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Discogs respondeu ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    const results = (data.results || []).map((item) => {
      const [artist, ...rest] = (item.title || '').split(' - ');
      // A Discogs desambigua artistas com nomes repetidos com um sufixo
      // "(2)", "(3)" etc — isso não existe em outros catálogos (iTunes),
      // então tira daqui pra não atrapalhar quem for comparar os nomes.
      const cleanArtist = artist.replace(/\s*\(\d+\)\s*$/, '').trim();
      return {
        id: item.master_id || item.id,
        title: rest.length ? rest.join(' - ') : item.title,
        artist: rest.length ? cleanArtist : null,
        artwork: item.cover_image || item.thumb || null,
        year: item.year || null,
        genre: item.genre?.[0] || null,
        style: item.style?.[0] || null,
        country: item.country || null,
        popularity: item.community?.have || 0,
        discogsUrl: item.uri ? `https://www.discogs.com${item.uri}` : null,
      };
    });

    return NextResponse.json({
      results,
      page: data.pagination?.page || 1,
      pages: data.pagination?.pages || 1,
      total: data.pagination?.items || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar na Discogs.' }, { status: 502 });
  }
}
