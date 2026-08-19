// src/app/api/top-albums/route.js
import { NextResponse } from 'next/server';

// Essa chamada roda no servidor do Next.js, então CORS não se aplica aqui —
// só se aplica quando o navegador chama diretamente. Por isso proxeamos.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'us';
  const limit = searchParams.get('limit') || '12';

  const appleUrl = `https://rss.marketingtools.apple.com/api/v2/${country}/music/most-played/${limit}/albums.json`;

  try {
    const res = await fetch(appleUrl, {
      // evita que o Next sirva um cache velho enquanto você testa
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Apple Music respondeu ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha ao buscar o chart da Apple Music.' },
      { status: 502 }
    );
  }
}
