// src/app/api/search-albums/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('term');
  const limit = searchParams.get('limit') || '12';

  if (!term) {
    return NextResponse.json({ error: 'Parâmetro "term" é obrigatório.' }, { status: 400 });
  }

  const itunesUrl = new URL('https://itunes.apple.com/search');
  itunesUrl.searchParams.set('term', term);
  itunesUrl.searchParams.set('entity', 'album');
  itunesUrl.searchParams.set('limit', limit);

  try {
    const res = await fetch(itunesUrl.toString(), { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `iTunes respondeu ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha ao buscar no iTunes.' },
      { status: 502 }
    );
  }
}
