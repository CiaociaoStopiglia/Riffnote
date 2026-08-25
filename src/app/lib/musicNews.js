// src/app/lib/musicNews.js
import axios from 'axios';

export async function fetchMusicNews(limit = 20) {
  const { data } = await axios.get('/api/music-news', { params: { limit } });
  return data.news || [];
}