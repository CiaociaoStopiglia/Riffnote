// src/app/noticias/page.jsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal, Spin } from 'antd';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { ArrowLeft, Newspaper, ExternalLink, X } from 'lucide-react';
import { fetchMusicNews } from '../lib/musicNews';
import styles from './page.module.css';

function timeAgo(dateString) {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'agora há pouco';
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

export default function NoticiasPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchMusicNews(20)
      .then(setNews)
      .catch(() => toast.error('Não consegui carregar as notícias agora.'))
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = news;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <div className={styles.header}>
        <span className={styles.eyebrow}>
          <Newspaper size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 6 }} />
          direto das fontes
        </span>
        <h1 className={styles.title}>Notícias</h1>
        <p className={styles.sub}>O que está rolando no mundo da música agora.</p>
      </div>

      <div className={styles.section}>
        {loading ? (
          <div className={styles.loadingRow}>
            <Spin /> <span>carregando notícias…</span>
          </div>
        ) : news.length === 0 ? (
          <div className={styles.emptyState}>Não consegui carregar notícias agora. Tenta de novo mais tarde.</div>
        ) : (
          <>
            {featured && (
              <motion.button
                type="button"
                className={styles.featured}
                onClick={() => setSelected(featured)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {featured.image ? (
                  <img src={featured.image} alt="" className={styles.featuredImage} />
                ) : (
                  <div className={styles.featuredImageFallback} />
                )}
                <div className={styles.featuredScrim} />
                <div className={styles.featuredContent}>
                  <span className={styles.featuredBadge}>destaque</span>
                  <div className={styles.featuredTitle}>{featured.title}</div>
                  <div className={styles.featuredMeta}>
                    {featured.source} · {timeAgo(featured.publishedAt)}
                  </div>
                </div>
              </motion.button>
            )}

            <div className={styles.grid}>
              {rest.map((item, i) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className={styles.card}
                  onClick={() => setSelected(item)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                >
                  {item.image ? (
                    <img src={item.image} alt="" className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbFallback} />
                  )}
                  <div className={styles.cardScrim} />
                  <div className={styles.cardContent}>
                    <span className={styles.cardSource}>{item.source}</span>
                    <div className={styles.cardTitle}>{item.title}</div>
                    <div className={styles.cardTime}>{timeAgo(item.publishedAt)}</div>
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal — abre aqui dentro do site; o botão final é que leva
          de verdade pra matéria original, em nova aba. */}
      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        title={null}
        closeIcon={<X size={18} />}
        width={560}
      >
        {selected && (
          <div>
            {selected.image && <img src={selected.image} alt="" className={styles.modalImage} />}
            <div className={styles.modalMeta}>
              {selected.source} · {timeAgo(selected.publishedAt)}
            </div>
            <div className={styles.modalTitle}>{selected.title}</div>
            {selected.description && <p className={styles.modalDesc}>{selected.description}</p>}
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.modalReadBtn}
            >
              Ler matéria completa <ExternalLink size={14} />
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}