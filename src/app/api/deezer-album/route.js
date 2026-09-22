// src/app/api/deezer-album/route.js
import { NextResponse } from 'next/server';

// Detalhes de um álbum da Deezer (já inclui a lista de faixas).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Parâmetro "id" inválido.' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.deezer.com/album/${id}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Deezer respondeu ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    if (data?.error) {
      return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar na Deezer.' }, { status: 502 });
  }
}
