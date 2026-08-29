// src/app/api/proxy-image/route.js
import { NextResponse } from 'next/server';

// Usado só pra gerar a imagem de compartilhamento (Stories) — desenhar uma
// imagem de outro domínio (Apple/iTunes) direto num <canvas> "contamina"
// o canvas e impede exportar como arquivo. Buscando aqui no servidor e
// servindo pelo nosso próprio domínio, isso deixa de ser um problema.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL inválida.' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Falha ao buscar imagem: ${res.status}` }, { status: 502 });
    }
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar a imagem.' }, { status: 502 });
  }
}