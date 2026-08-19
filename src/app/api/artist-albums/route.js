// src/app/api/artist-albums/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get('artistId');
  const limit = searchParams.get('limit') || '50';

  if (!artistId) {
    return NextResponse.json({ error: 'Parâmetro "artistId" é obrigatório.' }, { status: 400 });
  }

  const url = new URL('https://itunes.apple.com/lookup');
  url.searchParams.set('id', artistId);
  url.searchParams.set('entity', 'album');
  url.searchParams.set('limit', limit);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `iTunes respondeu ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar a discografia.' }, { status: 502 });
  }
}
