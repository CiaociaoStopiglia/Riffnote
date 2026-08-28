// src/app/profile/[uid]/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, UserCheck, Clock, Star, ListMusic } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { followUser, unfollowUser, isFollowing } from '../../lib/social';
import { listUserRatings } from '../../lib/ratings';
import { listActivity } from '../../lib/activity';
import { listUserLists } from '../../lib/lists';
import { listListenlist } from '../../lib/listenlist';
import { useAuth } from '../../context/AuthContext';
import { isAdminEmail } from '../../lib/admin';
import StarRating from '../../components/StarRating';
import { optimizeCloudinaryUrl } from '../../lib/cloudinary';
import FavoriteAlbumsRow from '../../components/FavoriteAlbumsRow';
import AvatarFrame from '../../components/AvatarFrame';
import FollowListModal from '../../components/FollowListModal';
import styles from '../page.module.css';

const TABS = ['Perfil', 'Sulco', 'Atividade', 'Listas', 'Listenlist'];

function timeAgo(timestamp) {
  if (!timestamp?.seconds) return '';
  const diffMs = Date.now() - timestamp.seconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatDay(timestamp) {
  if (!timestamp?.seconds) return '--';
  return String(new Date(timestamp.seconds * 1000).getDate()).padStart(2, '0');
}

function groupByMonth(items) {
  const groups = new Map();
  for (const item of items) {
    const seconds = item.updatedAt?.seconds || item.createdAt?.seconds;
    if (!seconds) continue;
    const date = new Date(seconds * 1000);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, entries]) => {
      const [year, month] = key.split('-').map(Number);
      return [`${MONTH_NAMES[month]} ${year}`, entries];
    });
}

export default function PublicProfilePage() {
  const { uid } = useParams();
  const router = useRouter();
  const { user: currentUser, loadingUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [activeTab, setActiveTab] = useState('Perfil');
  const [followModal, setFollowModal] = useState(null);
  const [ratedAlbums, setRatedAlbums] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listenlist, setListenlist] = useState([]);
  const [loadingListenlist, setLoadingListenlist] = useState(false);

  useEffect(() => {
    if (!loadingUser && currentUser && currentUser.uid === uid) {
      router.replace('/profile');
    }
  }, [loadingUser, currentUser, uid, router]);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          toast.error('Esse perfil não existe.');
          setLoadingProfile(false);
          return;
        }
        setProfile({ uid, ...snap.data() });
        listUserRatings(uid).then(setRatedAlbums).catch(() => {});

        setLoadingLists(true);
        listUserLists(uid)
          .then(setLists)
          .catch(() => {})
          .finally(() => setLoadingLists(false));

        if (currentUser) {
          const alreadyFollowing = await isFollowing(currentUser.uid, uid);
          setFollowing(alreadyFollowing);
        }
      } catch (err) {
        toast.error('Não consegui carregar esse perfil.');
      } finally {
        setLoadingProfile(false);
      }
    }

    if (uid) load();
  }, [uid, currentUser]);

  useEffect(() => {
    if (!uid) return;

    if (activeTab === 'Atividade' && activity.length === 0) {
      setLoadingActivity(true);
      listActivity(uid).then(setActivity).finally(() => setLoadingActivity(false));
    }
    if (activeTab === 'Listenlist' && listenlist.length === 0) {
      setLoadingListenlist(true);
      listListenlist(uid).then(setListenlist).finally(() => setLoadingListenlist(false));
    }
  }, [activeTab, uid]);

  async function handleToggleFollow() {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(currentUser.uid, uid);
        setFollowing(false);
        setProfile((p) => ({ ...p, followersCount: Math.max(0, (p.followersCount || 1) - 1) }));
      } else {
        await followUser(currentUser.uid, uid, {
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        });
        setFollowing(true);
        setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + 1 }));
        toast.success(`Você começou a seguir ${profile.displayName || 'esse usuário'}.`);
      }
    } catch (err) {
      toast.error('Não consegui completar essa ação.');
    } finally {
      setFollowBusy(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> voltar
        </Link>
        <div className={styles.content} style={{ paddingTop: 60 }}>
          <div className={styles.emptyState}>Esse perfil não existe ou foi removido.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${isAdminEmail(profile.email) ? styles.adminBg : ''}`}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.bannerSection}>
        <div
          className={styles.banner}
          style={profile.bannerURL ? { backgroundImage: `url(${optimizeCloudinaryUrl(profile.bannerURL)})` } : undefined}
        >
          <div
            className={`${styles.bannerOverlay} ${
              profile.bannerStyle === 'side' ? styles.bannerOverlaySide : styles.bannerOverlayBottom
            }`}
          />
        </div>

        <div className={styles.avatarFloat}>
          <AvatarFrame frame={profile.avatarFrame}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} />
              ) : (
                (profile.displayName || '?').charAt(0).toUpperCase()
              )}
            </div>
          </div>
          </AvatarFrame>
        </div>
      </div>

      <div className={styles.headerBar}>
        <div className={styles.nameBlock}>
          <div className={styles.displayName}>{profile.displayName || 'Sem nome'}</div>
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
            <span className={styles.statNum}>{profile.followingCount || 0}</span>
            <span className={styles.statLabel}>Seguindo</span>
          </button>
          <button
            type="button"
            className={`${styles.statItem} ${styles.clickable}`}
            onClick={() => setFollowModal('followers')}
          >
            <span className={styles.statNum}>{profile.followersCount || 0}</span>
            <span className={styles.statLabel}>Seguidores</span>
          </button>

          <button
            type="button"
            className={`${styles.followBtn} ${following ? styles.followBtnFollowing : styles.followBtnFollow}`}
            onClick={handleToggleFollow}
            disabled={followBusy}
          >
            {following ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {following ? 'Seguindo' : 'Seguir'}
          </button>
        </div>

        <FollowListModal
          open={!!followModal}
          mode={followModal}
          uid={uid}
          onClose={() => setFollowModal(null)}
        />
      </div>

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
            {profile.bio && (
              <div className={styles.bioSection}>
                <span className={styles.bioLabel}>Biografia</span>
                <p className={styles.bioText}>{profile.bio}</p>
              </div>
            )}

            <div className={styles.bioSection} style={{ marginTop: 28 }}>
              <FavoriteAlbumsRow albums={profile.favoriteAlbums || []} editable={false} />
            </div>

            <div className={styles.bioSection} style={{ marginTop: 28 }}>
              <div className={styles.sectionRow}>
                <span className={styles.bioLabel}>Álbuns avaliados</span>
                {ratedAlbums.length > 0 && (
                  <Link href={`/profile/${uid}/albuns`} className={styles.toggleLink}>
                    ver todos ({ratedAlbums.length})
                  </Link>
                )}
              </div>
              {ratedAlbums.length === 0 ? (
                <div className={styles.emptyState} style={{ marginTop: 12 }}>
                  {profile.displayName || 'Esse usuário'} ainda não avaliou nenhum álbum.
                </div>
              ) : (
                <div className={styles.ratedGridPreviewWrap}>
                  <div className={styles.ratedGrid} style={{ marginTop: 14 }}>
                    {ratedAlbums.slice(0, 5).map((item) => (
                      <Link key={item.albumId} href={`/album/${item.albumId}`} className={styles.ratedCard}>
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
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resenhas com texto completo agora vivem na aba Sulco —
                sem duplicar aqui. */}

            {/* Preview das listas */}
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
                  {profile.displayName || 'Esse usuário'} ainda não criou nenhuma lista.
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

        {activeTab === 'Sulco' && (
          <>
            {ratedAlbums.length === 0 ? (
              <div className={styles.emptyState}>
                {profile.displayName || 'Esse usuário'} ainda não tem nada no sulco.
              </div>
            ) : (
              <div className={styles.sulcoWrap}>
                {groupByMonth(ratedAlbums).map(([monthLabel, entries]) => (
                  <div key={monthLabel}>
                    <div className={styles.sulcoMonth}>{monthLabel}</div>
                    {entries.map((item) => (
                      <div key={item.albumId} className={styles.sulcoEntry}>
                        <span className={styles.sulcoDay}>{formatDay(item.updatedAt)}</span>
                        <span className={styles.sulcoDot} />
                        <Link href={`/album/${item.albumId}`} className={styles.sulcoCover}>
                          {item.artwork ? (
                            <img src={item.artwork} alt={item.albumTitle} />
                          ) : (
                            <div className={styles.sulcoCoverFallback} />
                          )}
                        </Link>
                        <div className={styles.sulcoBody}>
                          <Link href={`/album/${item.albumId}`} className={styles.sulcoTitle}>
                            {item.albumTitle}
                          </Link>
                          <div className={styles.sulcoArtist}>{item.albumArtist}</div>
                          <StarRating value={item.rating} readOnly size={12} />
                          {item.review && <p className={styles.sulcoReview}>"{item.review}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
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
            {loadingLists ? (
              <div className={styles.loadingRow}>
                <Spin size="small" /> carregando…
              </div>
            ) : lists.length === 0 ? (
              <div className={styles.emptyState}>
                {profile.displayName || 'Esse usuário'} ainda não criou nenhuma lista.
              </div>
            ) : (
              <div className={styles.listsGrid}>
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
                {profile.displayName || 'Esse usuário'} não tem nada na Listenlist.
              </div>
            ) : (
              <div className={styles.ratedGrid}>
                {listenlist.map((item) => (
                  <Link key={item.albumId} href={`/album/${item.albumId}`} className={styles.ratedCard}>
                    {item.artwork ? (
                      <img src={item.artwork} alt={item.albumTitle} className={styles.ratedCover} />
                    ) : (
                      <div className={styles.ratedCover} />
                    )}
                    <div className={styles.ratedTitle}>{item.albumTitle}</div>
                    <div className={styles.ratedArtist}>{item.albumArtist}</div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}