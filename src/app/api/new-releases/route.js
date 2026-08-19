// src/app/api/new-releases/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'us';
  const limit = searchParams.get('limit') || '20';

  const url = `https://rss.itunes.apple.com/api/v1/${country}/itunes-music/recent-releases/${limit}/explicit.json`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Apple respondeu ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar lançamentos recentes.' }, { status: 502 });
  }
}
