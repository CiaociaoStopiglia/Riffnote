// src/app/album/[id]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Spin, Input } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Play, Trash2, Bookmark, BookmarkCheck, ListPlus, Plus, Check, Share2, X } from 'lucide-react';
import { fetchAlbumFull } from '../../lib/musicApi';
import { getUserRating, rateAlbum, removeRating, getAlbumStats, updateAlbumTags } from '../../lib/ratings';
import { shareStoryImage } from '../../lib/shareStory';
import {
  getUserTrackRatingsForAlbum,
  rateTrack,
  removeTrackRating,
} from '../../lib/trackRatings';
import { isInListenlist, addToListenlist, removeFromListenlist } from '../../lib/listenlist';
import { listUserLists, createList, addAlbumToList, removeAlbumFromList } from '../../lib/lists';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../../components/StarRating';
import styles from './page.module.css';

function formatDuration(ms) {
  if (!ms) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AlbumPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [myTags, setMyTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [savingRating, setSavingRating] = useState(false);
  const [hasRating, setHasRating] = useState(false);
  const [communityStats, setCommunityStats] = useState(null); // { average, count }

  const [inListenlist, setInListenlist] = useState(false);
  const [listenlistBusy, setListenlistBusy] = useState(false);

  const [listsOpen, setListsOpen] = useState(false);
  const [myLists, setMyLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');

  const [trackRatings, setTrackRatings] = useState({}); // { [trackId]: nota }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { album: albumData, tracks: trackData } = await fetchAlbumFull(id);
        if (cancelled) return;
        setAlbum(albumData);
        setTracks(trackData);
      } catch (err) {
        if (!cancelled) toast.error('Não consegui carregar esse álbum.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Média da comunidade — carrega mesmo sem estar logado.
  useEffect(() => {
    if (!id) return;
    getAlbumStats(id).then(setCommunityStats).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    getUserRating(user.uid, id).then((data) => {
      if (data) {
        setMyRating(data.rating);
        setMyReview(data.review || '');
        setMyTags(data.tags || []);
        setHasRating(true);
      }
    });
    isInListenlist(user.uid, id).then(setInListenlist);

    getUserTrackRatingsForAlbum(user.uid, id)
      .then((map) => {
        const ratingsOnly = {};
        Object.entries(map).forEach(([trackId, data]) => {
          ratingsOnly[trackId] = data.rating;
        });
        setTrackRatings(ratingsOnly);
      })
      .catch((err) => {
        console.error('Erro ao buscar avaliações de faixa:', err);
        toast.error('Não consegui carregar suas notas de faixa salvas anteriormente.');
      });
  }, [user, id]);

  async function handleRateTrack(track, value) {
    if (!user || !album) return;
    const previous = trackRatings[track.id] || 0;
    setTrackRatings((prev) => ({ ...prev, [track.id]: value })); // otimista
    try {
      await rateTrack(user.uid, track, album, value);
    } catch (err) {
      setTrackRatings((prev) => ({ ...prev, [track.id]: previous }));
      toast.error('Não consegui salvar a nota dessa faixa.');
    }
  }

  async function handleRemoveTrackRating(trackId) {
    if (!user) return;
    const previous = trackRatings[trackId];
    setTrackRatings((prev) => {
      const next = { ...prev };
      delete next[trackId];
      return next;
    });
    try {
      await removeTrackRating(user.uid, trackId);
    } catch (err) {
      setTrackRatings((prev) => ({ ...prev, [trackId]: previous }));
      toast.error('Não consegui remover a nota dessa faixa.');
    }
  }

  async function handleRate(value) {
    if (!user || !album) return;
    setSavingRating(true);
    try {
      await rateAlbum(user.uid, album, value, myReview);
      setMyRating(value);
      setHasRating(true);
      toast.success(`Você deu ${value} estrela${value > 1 ? 's' : ''} pra esse álbum.`);
    } catch (err) {
      toast.error('Não consegui salvar sua avaliação.');
    } finally {
      setSavingRating(false);
    }
  }

  async function handleSaveReview() {
    if (!user || !album || myRating === 0) {
      toast.error('Dá uma nota em estrelas primeiro.');
      return;
    }
    setSavingRating(true);
    try {
      await rateAlbum(user.uid, album, myRating, myReview);
      toast.success('Resenha salva.');
    } catch (err) {
      toast.error('Não consegui salvar sua resenha.');
    } finally {
      setSavingRating(false);
    }
  }

  async function handleAddTag() {
    const clean = newTag.trim();
    if (!clean) return;
    if (myTags.includes(clean)) {
      setNewTag('');
      return;
    }
    if (myTags.length >= 6) {
      toast.error('Máximo de 6 tags por álbum.');
      return;
    }
    const next = [...myTags, clean];
    setMyTags(next);
    setNewTag('');
    try {
      await updateAlbumTags(user.uid, id, next);
    } catch (err) {
      setMyTags(myTags);
      toast.error('Não consegui salvar essa tag.');
    }
  }

  async function handleRemoveTag(tag) {
    const next = myTags.filter((t) => t !== tag);
    setMyTags(next);
    try {
      await updateAlbumTags(user.uid, id, next);
    } catch (err) {
      setMyTags(myTags);
      toast.error('Não consegui remover essa tag.');
    }
  }

  async function handleRemoveRating() {
    if (!user) return;
    setSavingRating(true);
    try {
      await removeRating(user.uid, id);
      setMyRating(0);
      setMyReview('');
      setHasRating(false);
      toast.success('Avaliação removida.');
    } catch (err) {
      toast.error('Não consegui remover a avaliação.');
    } finally {
      setSavingRating(false);
    }
  }

  async function handleToggleListenlist() {
    if (!user || !album) return;
    setListenlistBusy(true);
    try {
      if (inListenlist) {
        await removeFromListenlist(user.uid, album.id);
        setInListenlist(false);
      } else {
        await addToListenlist(user.uid, album);
        setInListenlist(true);
        toast.success('Adicionado à sua Listenlist.');
      }
    } catch (err) {
      toast.error('Não consegui atualizar sua Listenlist.');
    } finally {
      setListenlistBusy(false);
    }
  }

  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!album || myRating === 0) {
      toast.error('Dá uma nota antes de compartilhar.');
      return;
    }
    setSharing(true);
    try {
      const result = await shareStoryImage(album, myRating, myReview);
      if (result === 'downloaded') {
        toast.success('Imagem baixada! Agora é só subir nos seus Stories.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Não consegui gerar a imagem de compartilhamento.');
      }
    } finally {
      setSharing(false);
    }
  }

  async function openListsPanel() {
    if (!user) return;
    setListsOpen((v) => !v);
    if (!listsOpen && myLists.length === 0) {
      setLoadingLists(true);
      try {
        const lists = await listUserLists(user.uid);
        setMyLists(lists);
      } catch (err) {
        toast.error('Não consegui carregar suas listas.');
      } finally {
        setLoadingLists(false);
      }
    }
  }

  async function handleToggleAlbumInList(list) {
    const isIn = list.items.some((item) => item.id === album.id);
    try {
      if (isIn) {
        await removeAlbumFromList(list.id, album.id);
      } else {
        await addAlbumToList(list.id, album);
      }
      setMyLists((prev) =>
        prev.map((l) =>
          l.id === list.id
            ? {
                ...l,
                items: isIn
                  ? l.items.filter((i) => i.id !== album.id)
                  : [...l.items, { id: album.id, title: album.title, artist: album.artist, artwork: album.artwork }],
              }
            : l
        )
      );
    } catch (err) {
      toast.error('Não consegui atualizar a lista.');
    }
  }

  async function handleCreateList() {
    const title = newListTitle.trim();
    if (!title || !user) return;
    try {
      const listId = await createList(user.uid, title);
      const newList = { id: listId, ownerId: user.uid, title, items: [] };
      await addAlbumToList(listId, album);
      setMyLists((prev) => [{ ...newList, items: [{ id: album.id, title: album.title, artist: album.artist, artwork: album.artwork }] }, ...prev]);
      setNewListTitle('');
      toast.success(`Lista "${title}" criada com esse álbum.`);
    } catch (err) {
      toast.error('Não consegui criar a lista.');
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className={styles.page}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> voltar
        </Link>
        <div className={styles.section}>Esse álbum não foi encontrado.</div>
      </div>
    );
  }

  const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.header}>
        {album.artwork ? (
          <img src={album.artwork} alt={album.title} className={styles.cover} />
        ) : (
          <div className={styles.cover} />
        )}

        <div className={styles.headerInfo}>
          <span className={styles.eyebrow}>Álbum</span>
          <h1 className={styles.title}>{album.title}</h1>
          {album.artistId ? (
            <Link href={`/artista/${album.artistId}`} className={styles.artistLink}>
              {album.artist}
            </Link>
          ) : (
            <div className={styles.artist}>{album.artist}</div>
          )}

          <div className={styles.metaRow}>
            {releaseYear && <span>{releaseYear}</span>}
            {album.genre && <span>{album.genre}</span>}
            {album.trackCount && <span>{album.trackCount} faixas</span>}
          </div>

          {communityStats && communityStats.count > 0 && (
            <div className={styles.communityRating}>
              <StarRating value={communityStats.average} readOnly size={16} />
              <span className={styles.communityRatingText}>
                {communityStats.average.toFixed(1)} · {communityStats.count}{' '}
                avaliação{communityStats.count > 1 ? 'ões' : ''} na comunidade
              </span>
            </div>
          )}

          {user ? (
            <>
              <div className={styles.ratingBlock}>
                <StarRating value={myRating} onChange={handleRate} size={24} />
                {myRating > 0 && (
                  <span className={styles.ratingValue}>
                    {savingRating ? 'salvando…' : `sua nota: ${myRating}/5`}
                  </span>
                )}
                {hasRating && (
                  <button type="button" className={styles.removeRatingBtn} onClick={handleRemoveRating}>
                    <Trash2 size={13} /> remover avaliação
                  </button>
                )}
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${inListenlist ? styles.actionBtnActive : ''}`}
                  onClick={handleToggleListenlist}
                  disabled={listenlistBusy}
                >
                  {inListenlist ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                  {inListenlist ? 'Na Listenlist' : 'Quero ouvir'}
                </button>

                {myRating > 0 && (
                  <button type="button" className={styles.actionBtn} onClick={handleShare} disabled={sharing}>
                    <Share2 size={15} />
                    {sharing ? 'Gerando…' : 'Compartilhar'}
                  </button>
                )}

                <div className={styles.listsWrap}>
                  <button type="button" className={styles.actionBtn} onClick={openListsPanel}>
                    <ListPlus size={15} /> Adicionar a uma lista
                  </button>

                  {listsOpen && (
                    <div className={styles.listsPanel}>
                      {loadingLists ? (
                        <div className={styles.listsLoading}>
                          <Spin size="small" /> carregando…
                        </div>
                      ) : (
                        <>
                          {myLists.length === 0 && (
                            <div className={styles.listsEmpty}>Você ainda não tem listas.</div>
                          )}
                          {myLists.map((list) => {
                            const isIn = list.items.some((item) => item.id === album.id);
                            return (
                              <button
                                key={list.id}
                                type="button"
                                className={styles.listOption}
                                onClick={() => handleToggleAlbumInList(list)}
                              >
                                <span
                                  className={`${styles.listCheck} ${isIn ? styles.listCheckOn : ''}`}
                                >
                                  {isIn && <Check size={12} />}
                                </span>
                                {list.title}
                              </button>
                            );
                          })}
                          <div className={styles.newListRow}>
                            <input
                              className={styles.newListInput}
                              placeholder="Nova lista…"
                              value={newListTitle}
                              onChange={(e) => setNewListTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                            />
                            <button type="button" className={styles.newListBtn} onClick={handleCreateList}>
                              <Plus size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.reviewBlock}>
                <label className={styles.reviewLabel}>Sua resenha (opcional)</label>
                <Input.TextArea
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  placeholder="O que você achou desse álbum?"
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  maxLength={1000}
                />
                <button
                  type="button"
                  className={styles.saveReviewBtn}
                  onClick={handleSaveReview}
                  disabled={savingRating}
                >
                  Salvar resenha
                </button>
              </div>

              <div className={styles.tagsBlock}>
                <label className={styles.reviewLabel}>Suas tags</label>
                <div className={styles.tagsRow}>
                  {myTags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} aria-label={`Remover tag ${tag}`}>
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                {myTags.length < 6 && (
                  <div className={styles.tagInputRow}>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onPressEnter={handleAddTag}
                      placeholder="ex: clássico pessoal, nostalgia…"
                      maxLength={24}
                    />
                    <button type="button" className={styles.tagAddBtn} onClick={handleAddTag}>
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.ratingBlock}>
              <StarRating value={0} readOnly size={24} />
              <span className={styles.loginPrompt}>
                <Link href="/login">Entra na sua conta</Link> pra avaliar
              </span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Faixas</div>
        <div className={styles.trackList}>
          {tracks.map((track) => {
            const trackRating = trackRatings[track.id] || 0;
            return (
              <div key={track.id} className={styles.trackRow}>
                <div className={styles.trackMain}>
                  <span className={styles.trackNumber}>{track.number}</span>
                  <span className={styles.trackTitle}>{track.title}</span>
                  <span className={styles.trackDuration}>{formatDuration(track.durationMs)}</span>
                  {track.previewUrl ? (
                    <audio controls src={track.previewUrl} className={styles.trackAudio} />
                  ) : (
                    <span className={styles.trackNoPreview}>sem prévia</span>
                  )}
                </div>
                {user && (
                  <div className={styles.trackRatingRow}>
                    <StarRating
                      value={trackRating}
                      onChange={(value) => handleRateTrack(track, value)}
                      size={13}
                    />
                    {trackRating > 0 && (
                      <button
                        type="button"
                        className={styles.trackRatingClear}
                        onClick={() => handleRemoveTrackRating(track.id)}
                        title="Remover nota dessa faixa"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className={styles.hint}>
          <Play size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
          prévias de 30s fornecidas pela Apple/iTunes
        </p>
      </div>
    </div>
  );
}