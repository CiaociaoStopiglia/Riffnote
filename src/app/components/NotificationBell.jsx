// src/app/components/NotificationBell.jsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, UserPlus, MessageCircleReply, Layers } from 'lucide-react';
import { listNotifications, markNotificationRead, markAllRead } from '../lib/notifications';
import styles from './NotificationBell.module.css';

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

function notificationText(n) {
  if (n.type === 'follow') return <><strong>{n.fromName}</strong> começou a te seguir</>;
  if (n.type === 'answer') return <><strong>{n.fromName}</strong> respondeu sua pergunta sobre {n.albumTitle}</>;
  if (n.type === 'tierlist_clone') return <><strong>{n.fromName}</strong> fez a versão dela da sua tier list "{n.tierListTitle}"</>;
  return 'Nova notificação';
}

function notificationHref(n) {
  if (n.type === 'follow') return `/profile/${n.fromUid}`;
  if (n.type === 'answer') return `/comunidade/pergunta/${n.questionId}`;
  if (n.type === 'tierlist_clone') return `/tierlist/${n.tierListId}`;
  return '/';
}

function notificationIcon(type) {
  if (type === 'follow') return <UserPlus size={14} />;
  if (type === 'answer') return <MessageCircleReply size={14} />;
  if (type === 'tierlist_clone') return <Layers size={14} />;
  return <Bell size={14} />;
}

export default function NotificationBell({ uid }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function load() {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await listNotifications(uid, 30);
      setNotifications(list);
    } catch (err) {
      // silencioso — sino não deve travar a navegação
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!uid) return;
    load();
    const interval = setInterval(load, 30_000); // atualiza sozinho a cada 30s
    return () => clearInterval(interval);
  }, [uid]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleToggle() {
    setOpen((v) => !v);
    if (!open) load();
  }

  async function handleItemClick(n) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markNotificationRead(uid, n.id).catch(() => {});
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllRead(uid, notifications).catch(() => {});
  }

  if (!uid) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button type="button" className={styles.bellBtn} onClick={handleToggle} title="Notificações">
        <Bell size={16} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>Notificações</span>
            {unreadCount > 0 && (
              <button type="button" className={styles.markAllBtn} onClick={handleMarkAll}>
                marcar tudo como lido
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className={styles.empty}>
              {loading ? 'carregando…' : 'Nenhuma notificação ainda.'}
            </div>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n)}
                className={`${styles.item} ${!n.read ? styles.itemUnread : ''}`}
                onClick={() => handleItemClick(n)}
              >
                {n.fromPhoto ? (
                  <img src={n.fromPhoto} alt="" className={styles.avatar} />
                ) : (
                  <div className={styles.avatar}>{notificationIcon(n.type)}</div>
                )}
                <div className={styles.itemBody}>
                  <div className={styles.itemText}>{notificationText(n)}</div>
                  <div className={styles.itemTime}>{timeAgo(n.createdAt)}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}