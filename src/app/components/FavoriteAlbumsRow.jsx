// src/app/components/FavoriteAlbumsRow.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { Pencil, Check, X, Plus } from 'lucide-react';
import { searchAlbums } from '../lib/musicApi';
import { saveFavoriteAlbums } from '../lib/favorites';
import styles from './FavoriteAlbumsRow.module.css';

const SLOTS = 5;

/**
 * Fileira estilo Letterboxd: 5 álbuns favoritos fixados no perfil.
 *
 * - editable=false (perfil de outra pessoa): só mostra, sem controles.
 * - editable=true (seu próprio perfil): mostra botão "editar", que revela
 *   os slots vazios e o "x" pra remover; clicar num slot abre a busca.
 */
export default function FavoriteAlbumsRow({ uid, albums = [], editable = false, onChange }) {
  const [editing, setEditing] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // não editável e sem nenhum favorito ainda: não mostra a seção
  if (!editable && albums.length === 0) return null;

  const slots = Array.from({ length: SLOTS }, (_, i) => albums[i] || null);

  function openSlot(index) {
    setActiveSlot(index);
    setQuery('');
    setResults([]);
  }

  async function handleSearch() {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    try {
      const found = await searchAlbums(term, { limit: 8 });
      setResults(found);
    } catch (err) {
      toast.error('Não consegui buscar álbuns.');
    } finally {
      setSearching(false);
    }
  }

  async function handlePick(album) {
    const next = [...albums];
    next[activeSlot] = { id: album.id, title: album.title, artist: album.artist, artwork: album.artwork };
    // remove duplicata do mesmo álbum em outro slot, se houver
    const deduped = next.filter((a, i) => !a || next.findIndex((b) => b?.id === a.id) === i);

    setSaving(true);
    try {
      await saveFavoriteAlbums(uid, deduped.filter(Boolean));
      onChange?.(deduped.filter(Boolean));
      setActiveSlot(null);
      toast.success('Favorito atualizado.');
    } catch (err) {
      toast.error('Não consegui salvar. Tenta de novo.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(index) {
    const next = albums.filter((_, i) => i !== index);
    setSaving(true);
    try {
      await saveFavoriteAlbums(uid, next);
      onChange?.(next);
    } catch (err) {
      toast.error('Não consegui remover.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>Álbuns favoritos</span>
        {editable && (
          <button type="button" className={styles.editBtn} onClick={() => setEditing((v) => !v)}>
            {editing ? <Check size={13} /> : <Pencil size={13} />}
            {editing ? 'pronto' : 'editar'}
          </button>
        )}
      </div>

      <div className={styles.row}>
        {slots.map((album, i) => (
          <div key={i} className={styles.slot}>
            {album ? (
              editing ? (
                <>
                  <button type="button" className={styles.removeBtn} onClick={() => handleRemove(i)} title="Remover">
                    <X size={13} />
                  </button>
                  <img src={album.artwork} alt={album.title} className={styles.slotCover} />
                </>
              ) : (
                <Link href={`/album/${album.id}`} className={styles.slotFilled}>
                  <img src={album.artwork} alt={album.title} className={styles.slotCover} />
                </Link>
              )
            ) : editable && editing ? (
              <button type="button" className={styles.slotEmpty} onClick={() => openSlot(i)}>
                <Plus size={20} />
              </button>
            ) : (
              <div className={styles.slotEmpty} style={{ cursor: 'default' }} />
            )}
          </div>
        ))}
      </div>

      {editable && editing && activeSlot !== null && (
        <div className={styles.searchPanel}>
          <Input
            placeholder="Busca o álbum favorito…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
            suffix={searching ? <Spin size="small" /> : null}
            autoFocus
          />
          {results.length > 0 && (
            <div className={styles.searchResults}>
              {results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={styles.resultItem}
                  onClick={() => handlePick(a)}
                  disabled={saving}
                >
                  {a.artwork && <img src={a.artwork} alt="" />}
                  <div className={styles.resultText}>
                    <div className={styles.resultTitle}>{a.title}</div>
                    <div className={styles.resultArtist}>{a.artist}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}