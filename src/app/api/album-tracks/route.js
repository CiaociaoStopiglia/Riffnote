// src/app/api/album-tracks/route.js
import { NextResponse } from 'next/server';

// "lookup" é o endpoint do iTunes pra pegar detalhes de um item específico
// (aqui, um álbum) junto com suas faixas (entity=song), incluindo previewUrl.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const collectionId = searchParams.get('collectionId');

  if (!collectionId) {
    return NextResponse.json(
      { error: 'Parâmetro "collectionId" é obrigatório.' },
      { status: 400 }
    );
  }

  const lookupUrl = new URL('https://itunes.apple.com/lookup');
  lookupUrl.searchParams.set('id', collectionId);
  lookupUrl.searchParams.set('entity', 'song');

  try {
    const res = await fetch(lookupUrl.toString(), { cache: 'no-store' });

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
      { error: 'Falha ao buscar as faixas do álbum.' },
      { status: 502 }
    );
  }
}
