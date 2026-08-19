// src/app/lista/[listId]/page.jsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spin } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeft, GripVertical, X, Trash2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getList, reorderListItems, removeAlbumFromList, deleteList } from '../../lib/lists';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';

export default function ListPage() {
  const { listId } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState(null);
  const [owner, setOwner] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const dragIndex = useRef(null);
  const [overIndex, setOverIndex] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  const isOwner = user && list && user.uid === list.ownerId;

  useEffect(() => {
    async function load() {
      try {
        const data = await getList(listId);
        if (!data) {
          toast.error('Essa lista não existe.');
          setLoading(false);
          return;
        }
        setList(data);
        setItems(data.items || []);

        const ownerSnap = await getDoc(doc(db, 'users', data.ownerId));
        if (ownerSnap.exists()) setOwner({ uid: data.ownerId, ...ownerSnap.data() });
      } catch (err) {
        toast.error('Não consegui carregar essa lista.');
      } finally {
        setLoading(false);
      }
    }

    if (listId) load();
  }, [listId]);

  function handleDragStart(index) {
    if (!isOwner) return;
    dragIndex.current = index;
    setDraggingIndex(index);
  }

  function handleDragOver(e, index) {
    if (!isOwner) return;
    e.preventDefault();
    setOverIndex(index);
  }

  async function handleDrop(index) {
    if (!isOwner || dragIndex.current === null) return;
    const from = dragIndex.current;
    const to = index;

    if (from === to) {
      setDraggingIndex(null);
      setOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(to, 0, moved);

    setItems(newItems);
    setDraggingIndex(null);
    setOverIndex(null);
    dragIndex.current = null;

    try {
      await reorderListItems(listId, newItems);
    } catch (err) {
      toast.error('Não consegui salvar a nova ordem.');
    }
  }

  async function handleRemoveItem(albumId) {
    if (!isOwner) return;
    const previous = items;
    setItems((prev) => prev.filter((i) => i.id !== albumId));
    try {
      await removeAlbumFromList(listId, albumId);
    } catch (err) {
      setItems(previous);
      toast.error('Não consegui remover esse álbum.');
    }
  }

  async function handleDeleteList() {
    if (!isOwner) return;
    if (!confirm(`Apagar a lista "${list.title}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteList(listId);
      toast.success('Lista apagada.');
      router.push('/profile');
    } catch (err) {
      toast.error('Não consegui apagar a lista.');
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className={styles.page}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> voltar
        </Link>
        <div className={styles.section}>
          <div className={styles.emptyState}>Essa lista não existe ou foi removida.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={owner ? `/profile/${owner.uid}` : '/'} className={styles.backLink}>
        <ArrowLeft size={16} /> voltar pro perfil
      </Link>

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>{list.title}</h1>
            {owner && (
              <Link href={`/profile/${owner.uid}`} className={styles.owner}>
                por {owner.displayName || owner.email}
              </Link>
            )}
            <div className={styles.count}>{items.length} álbuns</div>
          </div>

          {isOwner && (
            <button type="button" className={styles.deleteListBtn} onClick={handleDeleteList}>
              <Trash2 size={13} /> apagar lista
            </button>
          )}
        </div>

        {isOwner && items.length > 1 && (
          <p className={styles.hint}>Arraste os álbuns pelo ícone ⠿ pra reordenar.</p>
        )}
      </div>

      <div className={styles.section}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            Essa lista ainda não tem álbuns. Adiciona pela página de qualquer álbum.
          </div>
        ) : (
          <div className={styles.itemsList}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`${styles.itemRow} ${draggingIndex === index ? styles.itemRowDragging : ''} ${
                  overIndex === index ? styles.itemRowOver : ''
                }`}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
              >
                {isOwner && (
                  <span
                    className={styles.dragHandle}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                  >
                    <GripVertical size={16} />
                  </span>
                )}
                <span className={styles.itemPosition}>{index + 1}</span>
                {item.artwork ? (
                  <img src={item.artwork} alt={item.title} className={styles.itemCover} />
                ) : (
                  <div className={styles.itemCover} />
                )}
                <Link href={`/album/${item.id}`} className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{item.title}</div>
                  <div className={styles.itemArtist}>{item.artist}</div>
                </Link>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.itemRemoveBtn}
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
