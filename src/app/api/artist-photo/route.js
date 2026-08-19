// src/app/api/artist-photo/route.js
import { NextResponse } from 'next/server';

// A Deezer não manda cabeçalho CORS, então precisamos buscar no servidor
// (aqui) em vez de direto do navegador. Não exige chave/login pra busca
// pública de artistas.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Parâmetro "name" é obrigatório.' }, { status: 400 });
  }

  const url = new URL('https://api.deezer.com/search/artist');
  url.searchParams.set('q', name);
  url.searchParams.set('limit', '1');

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Deezer respondeu ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Falha ao buscar foto do artista.' }, { status: 502 });
  }
}
