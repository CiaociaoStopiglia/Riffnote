// src/app/lib/favorites.js
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// users/{uid}.favoriteAlbums -> array de até 5 álbuns: [{id,title,artist,artwork}]

export async function saveFavoriteAlbums(uid, albums) {
  await updateDoc(doc(db, 'users', uid), {
    favoriteAlbums: albums,
    updatedAt: serverTimestamp(),
  });
}