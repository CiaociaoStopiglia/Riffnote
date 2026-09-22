// src/app/api/deezer-search/route.js
import { NextResponse } from 'next/server';

// Busca álbuns na Deezer (sem chave). Aceita `artist` + `album` pra busca
// precisa por campo, ou `term` pra busca livre.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term');
  const artist = searchParams.get('artist');
  const album = searchParams.get('album');
  const limit = searchParams.get('limit') || '10';

  let q = term;
  if (artist && album) q = `artist:"${artist}" album:"${album}"`;

  if (!q) {
    return NextResponse.json({ error: 'Informe "term" ou "artist" + "album".' }, { status: 400 });
  }

  const url = new URL('https://api.deezer.com/search/album');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', limit);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Deezer respondeu ${res.status}` }, { status: 502 });
    }
    return NextResponse.json(await res.json());
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar na Deezer.' }, { status: 502 });
  }
}
