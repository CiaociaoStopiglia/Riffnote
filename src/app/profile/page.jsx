// src/app/profile/page.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { Camera, ArrowLeft, Save, Pencil, X, Plus, Clock, Star, Bookmark, ListMusic } from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { uploadImage } from '../lib/cloudinary';
import { listUserRatings, removeRating } from '../lib/ratings';
import { listActivity } from '../lib/activity';
import { listListenlist, removeFromListenlist } from '../lib/listenlist';
import { listUserLists, createList } from '../lib/lists';
import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../lib/admin';
import StarRating from '../components/StarRating';
import AvatarFrame from '../components/AvatarFrame';
import FollowListModal from '../components/FollowListModal';
import styles from './page.module.css';

const BIO_MAX = 280;
const MAX_IMAGE_MB = 6;
const TABS = ['Perfil', 'Atividade', 'Listas', 'Listenlist'];

function timeAgo(timestamp) {
  if (!timestamp?.seconds) return '';
  const diffMs = Date.now() - timestamp.seconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loadingUser } = useAuth();

  const [profile, setProfile] = useState({
    bio: '',
    photoURL: '',
    bannerURL: '',
    followersCount: 0,
    followingCount: 0,
    ratingsCount: 0,
    avatarFrame: 'none',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [activeTab, setActiveTab] = useState('Perfil');
  const [followModal, setFollowModal] = useState(null); // null | 'following' | 'followers'
  const [ratedAlbums, setRatedAlbums] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [listenlist, setListenlist] = useState([]);
  const [loadingListenlist, setLoadingListenlist] = useState(false);

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/login');
    }
  }, [loadingUser, user, router]);

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile({
            bio: data.bio || '',
            photoURL: data.photoURL || user.photoURL || '',
            avatarFrame: data.avatarFrame || 'none',
            bannerURL: data.bannerURL || '',
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            ratingsCount: data.ratingsCount || 0,
          });
        }
      } catch (err) {
        toast.error('Não consegui carregar seu perfil.');
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile();
    listUserRatings(user.uid).then(setRatedAlbums).catch(() => {});

    setLoadingLists(true);
    listUserLists(user.uid)
      .then(setLists)
      .catch(() => {})
      .finally(() => setLoadingLists(false));
  }, [user]);

  // Carrega o conteúdo de cada aba só quando ela é aberta pela primeira vez.
  useEffect(() => {
    if (!user) return;

    if (activeTab === 'Atividade' && activity.length === 0) {
      setLoadingActivity(true);
      listActivity(user.uid)
        .then(setActivity)
        .finally(() => setLoadingActivity(false));
    }

    if (activeTab === 'Listenlist' && listenlist.length === 0) {
      setLoadingListenlist(true);
      listListenlist(user.uid)
        .then(setListenlist)
        .finally(() => setLoadingListenlist(false));
    }
  }, [activeTab, user]);

  function validateFile(file) {
    if (!file.type.startsWith('image/')) {
      toast.error('Escolhe um arquivo de imagem.');
      return false;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande. Máximo ${MAX_IMAGE_MB}MB.`);
      return false;
    }
    return true;
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateFile(file)) return;

    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, `riffnote/avatars/${user.uid}`);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() });
      await updateAuthProfile(auth.currentUser, { photoURL: url });
      setProfile((p) => ({ ...p, photoURL: url }));
      toast.success('Foto de perfil atualizada.');
    } catch (err) {
      toast.error('Não consegui enviar a foto de perfil.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !validateFile(file)) return;

    setUploadingBanner(true);
    try {
      const url = await uploadImage(file, `riffnote/banners/${user.uid}`);
      await updateDoc(doc(db, 'users', user.uid), { bannerURL: url, updatedAt: serverTimestamp() });
      setProfile((p) => ({ ...p, bannerURL: url }));
      toast.success('Banner atualizado.');
    } catch (err) {
      toast.error('Não consegui enviar o banner.');
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleSaveBio() {
    setSavingBio(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { bio: profile.bio, updatedAt: serverTimestamp() });
      toast.success('Biografia salva.');
      setEditingBio(false);
    } catch (err) {
      toast.error('Não consegui salvar a biografia.');
    } finally {
      setSavingBio(false);
    }
  }

  async function handleRemoveRating(albumId) {
    const previous = ratedAlbums;
    setRatedAlbums((prev) => prev.filter((r) => r.albumId !== albumId));
    try {
      await removeRating(user.uid, albumId);
      setProfile((p) => ({ ...p, ratingsCount: Math.max(0, p.ratingsCount - 1) }));
      toast.success('Avaliação removida.');
    } catch (err) {
      setRatedAlbums(previous);
      toast.error('Não consegui remover a avaliação.');
    }
  }

  async function handleRemoveFromListenlist(albumId) {
    const previous = listenlist;
    setListenlist((prev) => prev.filter((i) => i.albumId !== albumId));
    try {
      await removeFromListenlist(user.uid, albumId);
    } catch (err) {
      setListenlist(previous);
      toast.error('Não consegui remover da Listenlist.');
    }
  }

  async function handleCreateList() {
    const title = newListTitle.trim();
    if (!title) return;
    setCreatingList(true);
    try {
      const listId = await createList(user.uid, title);
      setLists((prev) => [{ id: listId, title, items: [], ownerId: user.uid }, ...prev]);
      setNewListTitle('');
      toast.success(`Lista "${title}" criada.`);
    } catch (err) {
      toast.error('Não consegui criar a lista.');
    } finally {
      setCreatingList(false);
    }
  }

  if (loadingUser || !user || loadingProfile) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${isAdminEmail(user.email) ? styles.adminBg : ''}`}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.bannerSection}>
        <div
          className={styles.banner}
          style={profile.bannerURL ? { backgroundImage: `url(${profile.bannerURL})` } : undefined}
        >
          <div className={styles.bannerOverlay} />
          <button
            type="button"
            className={styles.bannerEditBtn}
            onClick={() => bannerInputRef.current?.click()}
            disabled={uploadingBanner}
          >
            <Camera size={13} />
            {uploadingBanner ? 'Enviando…' : 'Trocar banner'}
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={handleBannerChange}
          />
        </div>

        <div className={styles.avatarFloat}>
          <AvatarFrame frame={profile.avatarFrame}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={user.displayName || 'Avatar'} />
              ) : (
                (user.displayName || user.email || '?').charAt(0).toUpperCase()
              )}
            </div>
            <button
              type="button"
              className={styles.avatarEditBtn}
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <Camera size={14} />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={handleAvatarChange}
            />
          </div>
          </AvatarFrame>
        </div>
      </div>

      <div className={styles.headerBar}>
        <div className={styles.nameBlock}>
          <div className={styles.displayName}>{user.displayName || 'Sem nome'}</div>
          <div className={styles.handle}>{user.email}</div>
        </div>

        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statNum}>{profile.ratingsCount || 0}</span>
            <span className={styles.statLabel}>Álbuns</span>
          </div>
          <button
            type="button"
            className={`${styles.statItem} ${styles.clickable}`}
            onClick={() => setFollowModal('following')}
          >
            <span className={styles.statNum}>{profile.followingCount}</span>
            <span className={styles.statLabel}>Seguindo</span>
          </button>
          <button
            type="button"
            className={`${styles.statItem} ${styles.clickable}`}
            onClick={() => setFollowModal('followers')}
          >
            <span className={styles.statNum}>{profile.followersCount}</span>
            <span className={styles.statLabel}>Seguidores</span>
          </button>
        </div>
      </div>

      <FollowListModal
        open={!!followModal}
        mode={followModal}
        uid={user.uid}
        onClose={() => setFollowModal(null)}
      />

      <div className={styles.tabsBar}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'Perfil' && (
          <>
            <div className={styles.bioSection}>
              <span className={styles.bioLabel}>Biografia</span>
              {editingBio ? (
                <>
                  <Input.TextArea
                    className={styles.bioTextarea}
                    value={profile.bio}
                    onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, BIO_MAX) }))}
                    placeholder="Conta um pouco sobre seus gostos musicais…"
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    maxLength={BIO_MAX}
                    autoFocus
                  />
                  <div className={styles.bioFooter}>
                    <span className={styles.charCount}>{profile.bio.length}/{BIO_MAX}</span>
                    <button type="button" className={styles.saveBtn} onClick={handleSaveBio} disabled={savingBio}>
                      <Save size={14} />
                      {savingBio ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.bioText}>{profile.bio || 'Você ainda não escreveu nada sobre você.'}</p>
                  <button type="button" className={styles.editBioBtn} onClick={() => setEditingBio(true)}>
                    <Pencil size={12} /> Editar biografia
                  </button>
                </>
              )}
            </div>

            <div className={styles.bioSection} style={{ marginTop: 28 }}>
              <div className={styles.sectionRow}>
                <span className={styles.bioLabel}>Álbuns avaliados</span>
                {ratedAlbums.length > 12 && (
                  <Link href="/profile/albuns" className={styles.toggleLink}>
                    ver todos ({ratedAlbums.length})
                  </Link>
                )}
              </div>
              {ratedAlbums.length === 0 ? (
                <div className={styles.emptyState} style={{ marginTop: 12 }}>
                  Você ainda não avaliou nenhum álbum. Procura um na home e dá sua nota!
                </div>
              ) : (
                <div className={styles.ratedGridPreviewWrap}>
                  <div className={styles.ratedGrid} style={{ marginTop: 14 }}>
                    {ratedAlbums.slice(0, 12).map((item) => (
                      <div key={item.albumId} className={styles.ratedCardWrap}>
                        <button
                          type="button"
                          className={styles.ratedRemoveBtn}
                          onClick={() => handleRemoveRating(item.albumId)}
                          title="Remover avaliação"
                        >
                          <X size={13} />
                        </button>
                        <Link href={`/album/${item.albumId}`} className={styles.ratedCard}>
                          {item.artwork ? (
                            <img src={item.artwork} alt={item.albumTitle} className={styles.ratedCover} />
                          ) : (
                            <div className={styles.ratedCover} />
                          )}
                          <div className={styles.ratedTitle}>{item.albumTitle}</div>
                          <div className={styles.ratedArtist}>{item.albumArtist}</div>
                          <div className={styles.ratedStars}>
                            <StarRating value={item.rating} readOnly size={13} />
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                  {ratedAlbums.length > 12 && (
                    <div className={styles.ratedGridFade}>
                      <Link href="/profile/albuns" className={styles.ratedGridFadeBtn}>
                        Ver todos os {ratedAlbums.length} álbuns
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resenhas — só os álbuns em que a pessoa escreveu algo além da nota */}
            {ratedAlbums.some((r) => r.review) && (
              <div className={styles.bioSection} style={{ marginTop: 28 }}>
                <span className={styles.bioLabel}>Resenhas</span>
                <div className={styles.reviewsList} style={{ marginTop: 14 }}>
                  {ratedAlbums
                    .filter((r) => r.review)
                    .map((item) => (
                      <Link key={item.albumId} href={`/album/${item.albumId}`} className={styles.reviewRow}>
                        {item.artwork ? (
                          <img src={item.artwork} alt={item.albumTitle} className={styles.reviewCover} />
                        ) : (
                          <div className={styles.reviewCover} />
                        )}
                        <div className={styles.reviewBody}>
                          <div className={styles.reviewTop}>
                            <span className={styles.reviewTitle}>{item.albumTitle}</span>
                            <span className={styles.reviewArtistInline}>{item.albumArtist}</span>
                          </div>
                          <StarRating value={item.rating} readOnly size={12} />
                          <p className={styles.reviewText}>{item.review}</p>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Preview das listas — a gestão completa fica na aba Listas */}
            <div className={styles.bioSection} style={{ marginTop: 28 }}>
              <div className={styles.sectionRow}>
                <span className={styles.bioLabel}>Listas</span>
                {lists.length > 0 && (
                  <button type="button" className={styles.toggleLink} onClick={() => setActiveTab('Listas')}>
                    ver todas
                  </button>
                )}
              </div>
              {loadingLists ? (
                <div className={styles.loadingRow}>
                  <Spin size="small" /> carregando…
                </div>
              ) : lists.length === 0 ? (
                <div className={styles.emptyState} style={{ marginTop: 12 }}>
                  Você ainda não criou nenhuma lista.{' '}
                  <button type="button" className={styles.toggleLink} onClick={() => setActiveTab('Listas')}>
                    Criar uma
                  </button>
                </div>
              ) : (
                <div className={styles.listsGrid} style={{ marginTop: 14 }}>
                  {lists.slice(0, 4).map((list) => (
                    <Link key={list.id} href={`/lista/${list.id}`} className={styles.listCard}>
                      <div className={styles.listCardCovers}>
                        {list.items.slice(0, 4).map((item, i) =>
                          item.artwork ? (
                            <img key={i} src={item.artwork} alt="" />
                          ) : (
                            <div key={i} className={styles.listCardCoverEmpty} />
                          )
                        )}
                        {list.items.length === 0 && <div className={styles.listCardCoverEmpty} />}
                      </div>
                      <div className={styles.listCardTitle}>{list.title}</div>
                      <div className={styles.listCardCount}>{list.items.length} álbuns</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'Atividade' && (
          <>
            {loadingActivity ? (
              <div className={styles.loadingRow}>
                <Spin size="small" /> carregando…
              </div>
            ) : activity.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma atividade ainda.</div>
            ) : (
              <div className={styles.activityFeed}>
                {activity.map((item) => (
                  <div key={item.id} className={styles.activityRow}>
                    {item.artwork ? (
                      <img src={item.artwork} alt="" className={styles.activityCover} />
                    ) : (
                      <div className={styles.activityIcon}>
                        {item.type === 'list_created' ? <ListMusic size={16} /> : <Star size={16} />}
                      </div>
                    )}
                    <div className={styles.activityBody}>
                      {item.type === 'rated' && (
                        <>
                          <div className={styles.activityText}>
                            Avaliou <Link href={`/album/${item.albumId}`}>{item.albumTitle}</Link> com{' '}
                            {item.rating} estrela{item.rating > 1 ? 's' : ''}
                          </div>
                          {item.review && <p className={styles.activityReview}>"{item.review}"</p>}
                        </>
                      )}
                      {item.type === 'list_created' && (
                        <div className={styles.activityText}>
                          Criou a lista <Link href={`/lista/${item.listId}`}>{item.title}</Link>
                        </div>
                      )}
                      {item.type === 'listenlist_added' && (
                        <div className={styles.activityText}>
                          Adicionou <Link href={`/album/${item.albumId}`}>{item.albumTitle}</Link> à Listenlist
                        </div>
                      )}
                      {item.type === 'rated_track' && (
                        <div className={styles.activityText}>
                          Avaliou a faixa "{item.trackTitle}" de{' '}
                          <Link href={`/album/${item.albumId}`}>{item.albumTitle}</Link> com {item.rating} estrela
                          {item.rating > 1 ? 's' : ''}
                        </div>
                      )}
                      <span className={styles.activityTime}>
                        <Clock size={10} /> {timeAgo(item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'Listas' && (
          <>
            <div className={styles.newListRow}>
              <input
                className={styles.newListInput}
                placeholder="Nome da nova lista…"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              />
              <button type="button" className={styles.newListBtn} onClick={handleCreateList} disabled={creatingList}>
                <Plus size={14} /> Criar
              </button>
            </div>

            {loadingLists ? (
              <div className={styles.loadingRow}>
                <Spin size="small" /> carregando…
              </div>
            ) : lists.length === 0 ? (
              <div className={styles.emptyState} style={{ marginTop: 16 }}>
                Você ainda não criou nenhuma lista.
              </div>
            ) : (
              <div className={styles.listsGrid} style={{ marginTop: 16 }}>
                {lists.map((list) => (
                  <Link key={list.id} href={`/lista/${list.id}`} className={styles.listCard}>
                    <div className={styles.listCardCovers}>
                      {list.items.slice(0, 4).map((item, i) =>
                        item.artwork ? (
                          <img key={i} src={item.artwork} alt="" />
                        ) : (
                          <div key={i} className={styles.listCardCoverEmpty} />
                        )
                      )}
                      {list.items.length === 0 && <div className={styles.listCardCoverEmpty} />}
                    </div>
                    <div className={styles.listCardTitle}>{list.title}</div>
                    <div className={styles.listCardCount}>{list.items.length} álbuns</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'Listenlist' && (
          <>
            {loadingListenlist ? (
              <div className={styles.loadingRow}>
                <Spin size="small" /> carregando…
              </div>
            ) : listenlist.length === 0 ? (
              <div className={styles.emptyState}>
                Sua Listenlist está vazia. Adiciona álbuns que você quer ouvir depois.
              </div>
            ) : (
              <div className={styles.ratedGrid}>
                {listenlist.map((item) => (
                  <div key={item.albumId} className={styles.ratedCardWrap}>
                    <button
                      type="button"
                      className={styles.ratedRemoveBtn}
                      onClick={() => handleRemoveFromListenlist(item.albumId)}
                      title="Remover da Listenlist"
                    >
                      <X size={13} />
                    </button>
                    <Link href={`/album/${item.albumId}`} className={styles.ratedCard}>
                      {item.artwork ? (
                        <img src={item.artwork} alt={item.albumTitle} className={styles.ratedCover} />
                      ) : (
                        <div className={styles.ratedCover} />
                      )}
                      <div className={styles.ratedTitle}>{item.albumTitle}</div>
                      <div className={styles.ratedArtist}>{item.albumArtist}</div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}