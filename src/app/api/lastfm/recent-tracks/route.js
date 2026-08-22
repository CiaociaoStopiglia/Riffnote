// src/app/api/lastfm/recent-tracks/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const limit = searchParams.get('limit') || '25';

  if (!username) {
    return NextResponse.json({ error: 'Parâmetro "username" é obrigatório.' }, { status: 400 });
  }

  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  url.searchParams.set('method', 'user.getrecenttracks');
  url.searchParams.set('user', username);
  url.searchParams.set('api_key', process.env.LASTFM_API_KEY);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', limit);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();

    if (data.error) {
      // erro 6 do Last.fm = usuário não encontrado
      const message = data.error === 6 ? 'Usuário do Last.fm não encontrado.' : data.message;
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar no Last.fm.' }, { status: 502 });
  }
}
