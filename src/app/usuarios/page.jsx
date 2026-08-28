// src/app/usuarios/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, UserPlus, UserCheck } from 'lucide-react';
import { searchUsers, listRecentUsers } from '../lib/users';
import { followUser, unfollowUser, isFollowing } from '../lib/social';
import { useAuth } from '../context/AuthContext';
import styles from './page.module.css';

function UserRow({ person, currentUser, following, onToggleFollow }) {
  const isSelf = currentUser && currentUser.uid === person.uid;

  return (
    <div className={styles.userRow}>
      <Link href={`/profile/${person.uid}`} style={{ display: 'flex', gap: 14, flex: 1, minWidth: 0, alignItems: 'center' }}>
        <div className={styles.avatar}>
          {person.photoURL ? (
            <img src={person.photoURL} alt={person.displayName} />
          ) : (
            (person.displayName || person.email || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{person.displayName || 'Sem nome'}</div>
          {person.bio && <div className={styles.userBio}>{person.bio}</div>}
        </div>
      </Link>

      {!isSelf && currentUser && (
        <button
          type="button"
          className={`${styles.followBtn} ${following ? styles.followBtnFollowing : styles.followBtnFollow}`}
          onClick={() => onToggleFollow(person)}
        >
          {following ? <UserCheck size={13} /> : <UserPlus size={13} />}
          {following ? 'Seguindo' : 'Seguir'}
        </button>
      )}
    </div>
  );
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    listRecentUsers(30)
      .then((users) => setRecent(users.filter((u) => u.uid !== currentUser?.uid)))
      .catch(() => toast.error('Não consegui carregar sugestões de pessoas.'))
      .finally(() => setLoadingRecent(false));
  }, [currentUser]);

  // Checa, pra cada pessoa exibida, se o usuário logado já a segue.
  useEffect(() => {
    if (!currentUser) return;
    const list = searchResults ?? recent;
    Promise.all(
      list.map((p) => isFollowing(currentUser.uid, p.uid).then((f) => [p.uid, f]))
    ).then((pairs) => setFollowingMap((prev) => ({ ...prev, ...Object.fromEntries(pairs) })));
  }, [currentUser, recent, searchResults]);

  async function handleSearch() {
    const term = query.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(term, 30);
      const filtered = results.filter((u) => u.uid !== currentUser?.uid);
      if (filtered.length === 0) {
        toast(`Ninguém encontrado com o nome "${term}".`);
      }
      setSearchResults(filtered);
    } catch (err) {
      toast.error('Não consegui buscar. Tenta de novo.');
    } finally {
      setSearching(false);
    }
  }

  async function handleToggleFollow(person) {
    if (!currentUser) return;
    const alreadyFollowing = followingMap[person.uid];
    setFollowingMap((prev) => ({ ...prev, [person.uid]: !alreadyFollowing })); // otimista
    try {
      if (alreadyFollowing) {
        await unfollowUser(currentUser.uid, person.uid);
      } else {
        await followUser(currentUser.uid, person.uid, {
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        });
        toast.success(`Você começou a seguir ${person.displayName || 'essa pessoa'}.`);
      }
    } catch (err) {
      setFollowingMap((prev) => ({ ...prev, [person.uid]: alreadyFollowing }));
      toast.error('Não consegui completar essa ação.');
    }
  }

  const showingSearch = searchResults !== null;
  const list = showingSearch ? searchResults : recent;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pessoas</h1>
        <p className={styles.pageSub}>Encontre quem também vive de fone no ouvido.</p>
      </div>

      <div className={styles.searchWrap}>
        <Input
          size="large"
          placeholder="Buscar pelo nome…"
          prefix={<Search size={16} color="#6f6860" />}
          suffix={searching ? <Spin size="small" /> : null}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSearch}
        />
      </div>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>
          {showingSearch ? `Resultados para "${query}"` : 'Gente nova por aqui'}
        </div>

        {!showingSearch && loadingRecent ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando…</span>
          </div>
        ) : list.length === 0 ? (
          <div className={styles.emptyState}>Ninguém encontrado.</div>
        ) : (
          <div className={styles.userList}>
            {list.map((person) => (
              <UserRow
                key={person.uid}
                person={person}
                currentUser={currentUser}
                following={followingMap[person.uid]}
                onToggleFollow={handleToggleFollow}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}