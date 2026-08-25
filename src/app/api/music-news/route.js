// src/app/api/music-news/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '20';

  const url = new URL('https://api.currentsapi.services/v1/search');
  url.searchParams.set('keywords', 'música OR music OR álbum OR artista');
  url.searchParams.set('language', 'pt');
  url.searchParams.set('apiKey', process.env.CURRENTS_API_KEY);

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || data.status !== 'ok') {
      return NextResponse.json(
        { error: data.message || 'Falha ao buscar notícias.' },
        { status: 502 }
      );
    }

    const news = (data.news || []).slice(0, Number(limit)).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      url: item.url,
      image: item.image && item.image !== 'None' ? item.image : null,
      source: item.author || new URL(item.url).hostname.replace('www.', ''),
      publishedAt: item.published,
    }));

    return NextResponse.json({ news });
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar notícias.' }, { status: 502 });
  }
}