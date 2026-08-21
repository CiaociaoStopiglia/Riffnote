// src/app/tierlist/[id]/page.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Trash2, Copy } from 'lucide-react';
import { getTierList, saveTierList, deleteTierList, cloneTierListAsChallenge } from '../../lib/tierlists';
import { searchAlbums } from '../../lib/musicApi';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';

export default function TierListPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [tierList, setTierList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState([]);
  const [tiers, setTiers] = useState([]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const dragItem = useRef(null); // { zone, itemId }
  const [overZone, setOverZone] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const saveTimeout = useRef(null);

  const isOwner = user && tierList && user.uid === tierList.ownerId;

  useEffect(() => {
    async function load() {
      try {
        const data = await getTierList(id);
        if (!data) {
          toast.error('Essa tier list não existe.');
          return;
        }
        setTierList(data);
        setPool(data.pool || []);
        setTiers(data.tiers || []);
      } catch (err) {
        toast.error('Não consegui carregar essa tier list.');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  function scheduleSave(newPool, newTiers) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveTierList(id, { pool: newPool, tiers: newTiers }).catch(() => {
        toast.error('Não consegui salvar as mudanças.');
      });
    }, 600);
  }

  function moveItem(itemId, fromZone, toZone) {
    if (fromZone === toZone) return;

    let item = null;
    let newPool = pool;
    let newTiers = tiers;

    if (fromZone === 'pool') {
      item = pool.find((i) => i.id === itemId);
      newPool = pool.filter((i) => i.id !== itemId);
    } else {
      const tier = tiers.find((t) => t.id === fromZone);
      item = tier?.items.find((i) => i.id === itemId);
      newTiers = tiers.map((t) => (t.id === fromZone ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t));
    }

    if (!item) return;

    if (toZone === 'pool') {
      newPool = [...newPool, item];
    } else {
      newTiers = newTiers.map((t) => (t.id === toZone ? { ...t, items: [...t.items, item] } : t));
    }

    setPool(newPool);
    setTiers(newTiers);
    scheduleSave(newPool, newTiers);
  }

  function handleDragStart(itemId, zone) {
    if (!isOwner) return;
    dragItem.current = { zone, itemId };
    setDraggingId(itemId);
  }

  function handleDragOverZone(e, zone) {
    if (!isOwner) return;
    e.preventDefault();
    setOverZone(zone);
  }

  function handleDropZone(zone) {
    if (!isOwner || !dragItem.current) return;
    moveItem(dragItem.current.itemId, dragItem.current.zone, zone);
    dragItem.current = null;
    setDraggingId(null);
    setOverZone(null);
  }

  async function handleSearch() {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    try {
      const results = await searchAlbums(term, { limit: 8 });
      setSearchResults(results);
    } catch (err) {
      toast.error('Não consegui buscar álbuns.');
    } finally {
      setSearching(false);
    }
  }

  function handleAddAlbum(album) {
    const already = pool.some((i) => i.id === album.id) || tiers.some((t) => t.items.some((i) => i.id === album.id));
    if (already) {
      toast('Esse álbum já está na tier list.');
      return;
    }
    const item = { id: album.id, title: album.title, artist: album.artist, artwork: album.artwork };
    const newPool = [...pool, item];
    setPool(newPool);
    scheduleSave(newPool, tiers);
    setSearchResults((prev) => prev.filter((a) => a.id !== album.id));
  }

  async function handleClone() {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const newId = await cloneTierListAsChallenge(id, user);
      toast.success('Sua versão foi criada! Agora monta sua ranking.');
      router.push(`/tierlist/${newId}`);
    } catch (err) {
      toast.error('Não consegui criar sua versão.');
    }
  }

  async function handleDelete() {
    if (!confirm(`Apagar a tier list "${tierList.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteTierList(id);
      toast.success('Tier list apagada.');
      router.push('/comunidade');
    } catch (err) {
      toast.error('Não consegui apagar.');
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!tierList) {
    return (
      <div className={styles.page}>
        <Link href="/comunidade" className={styles.backLink}>
          <ArrowLeft size={16} /> voltar
        </Link>
        <div className={styles.emptyState}>Essa tier list não existe ou foi removida.</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/comunidade" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pra comunidade
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{tierList.title}</h1>
          <div className={styles.owner}>por {tierList.ownerName}</div>
          {!isOwner && <span className={styles.readOnlyBadge}>somente leitura</span>}
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={handleClone}>
            <Copy size={14} /> Fazer minha versão
          </button>
          {isOwner && (
            <button type="button" className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={handleDelete}>
              <Trash2 size={14} /> Apagar
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <p className={styles.hint}>Arraste os álbuns entre os tiers e o "banco" lá embaixo. Salva sozinho.</p>
      )}

      {isOwner && (
        <div className={styles.searchSection}>
          <div className={styles.searchWrap}>
            <Input
              placeholder="Buscar álbum pra adicionar…"
              prefix={<Search size={14} color="#6f6860" />}
              suffix={searching ? <Spin size="small" /> : null}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onPressEnter={handleSearch}
            />
            <button type="button" className={styles.searchBtn} onClick={handleSearch}>
              Buscar
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((a) => (
                <div key={a.id} className={styles.searchResultItem} onClick={() => handleAddAlbum(a)}>
                  {a.artwork && <img src={a.artwork} alt="" />}
                  <span className={styles.searchResultText}>{a.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.board}>
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`${styles.tierRow} ${overZone === tier.id ? styles.tierRowOver : ''}`}
            onDragOver={(e) => handleDragOverZone(e, tier.id)}
            onDrop={() => handleDropZone(tier.id)}
          >
            <div className={styles.tierLabel} style={{ background: tier.color }}>
              {tier.label}
            </div>
            <div className={styles.tierItems}>
              {tier.items.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.item} ${draggingId === item.id ? styles.itemDragging : ''}`}
                  draggable={isOwner}
                  onDragStart={() => handleDragStart(item.id, tier.id)}
                >
                  <Link href={`/album/${item.id}`} onClick={(e) => draggingId && e.preventDefault()}>
                    {item.artwork ? (
                      <img src={item.artwork} alt={item.title} className={styles.itemCover} />
                    ) : (
                      <div className={styles.itemCover} />
                    )}
                  </Link>
                  <div className={styles.itemTitle}>{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.poolSection}>
          <span className={styles.poolLabel}>banco (ainda não classificados)</span>
          <div
            className={`${styles.poolItems} ${overZone === 'pool' ? styles.poolItemsOver : ''}`}
            onDragOver={(e) => handleDragOverZone(e, 'pool')}
            onDrop={() => handleDropZone('pool')}
          >
            {pool.map((item) => (
              <div
                key={item.id}
                className={`${styles.item} ${draggingId === item.id ? styles.itemDragging : ''}`}
                draggable={isOwner}
                onDragStart={() => handleDragStart(item.id, 'pool')}
              >
                {item.artwork ? (
                  <img src={item.artwork} alt={item.title} className={styles.itemCover} />
                ) : (
                  <div className={styles.itemCover} />
                )}
                <div className={styles.itemTitle}>{item.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}