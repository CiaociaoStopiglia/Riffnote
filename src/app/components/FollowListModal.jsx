// src/app/components/FollowListModal.jsx
'use client';

import { useEffect, useState } from 'react';
import { Modal, Spin } from 'antd';
import Link from 'next/link';
import { X } from 'lucide-react';
import { listFollowing, listFollowers } from '../lib/social';
import styles from './FollowListModal.module.css';

// mode: 'following' | 'followers'
export default function FollowListModal({ open, onClose, uid, mode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !uid) return;
    setLoading(true);
    const fetcher = mode === 'following' ? listFollowing : listFollowers;
    fetcher(uid)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open, uid, mode]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      closeIcon={<X size={18} color="#a89f92" />}
      width={380}
    >
      <div className={styles.wrap}>
        <div className={styles.title}>{mode === 'following' ? 'Seguindo' : 'Seguidores'}</div>

        {loading ? (
          <div className={styles.loading}>
            <Spin size="small" /> carregando…
          </div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>
            {mode === 'following' ? 'Ainda não segue ninguém.' : 'Ainda não tem seguidores.'}
          </div>
        ) : (
          <div className={styles.list}>
            {users.map((u) => (
              <Link key={u.uid} href={`/profile/${u.uid}`} className={styles.row} onClick={onClose}>
                <div className={styles.avatar}>
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} />
                  ) : (
                    (u.displayName || u.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <span className={styles.name}>{u.displayName || u.email}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
