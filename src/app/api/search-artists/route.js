// src/app/api/search-artists/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term');
  const limit = searchParams.get('limit') || '16';

  if (!term) {
    return NextResponse.json({ error: 'Parâmetro "term" é obrigatório.' }, { status: 400 });
  }

  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('term', term);
  url.searchParams.set('entity', 'musicArtist');
  url.searchParams.set('limit', limit);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `iTunes respondeu ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar artistas.' }, { status: 502 });
  }
}
