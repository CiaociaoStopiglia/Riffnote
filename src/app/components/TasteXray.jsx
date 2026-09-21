// src/app/components/TasteXray.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Spin } from 'antd';
import { Download } from 'lucide-react';
import { getAlbumStats } from '../lib/ratings';
import { exportRatingsCsv, exportRatingsMarkdown } from '../lib/exportRatings';
import styles from './TasteXray.module.css';

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Calibragem: média por mês e se as notas estão subindo/caindo ao longo do tempo.
function buildCalibration(albums) {
  const dated = albums
    .map((a) => ({ rating: a.rating, seconds: a.createdAt?.seconds || a.updatedAt?.seconds }))
    .filter((a) => a.seconds)
    .sort((a, b) => a.seconds - b.seconds);
  if (dated.length < 6) return null;

  const byMonth = new Map();
  for (const a of dated) {
    const d = new Date(a.seconds * 1000);
    const key = d.getFullYear() * 12 + d.getMonth();
    const cur = byMonth.get(key) || { sum: 0, n: 0, label: `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
    cur.sum += a.rating;
    cur.n += 1;
    byMonth.set(key, cur);
  }
  const months = [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(-12)
    .map(([, m]) => ({ label: m.label, avg: m.sum / m.n, n: m.n }));

  const half = Math.floor(dated.length / 2);
  const avg = (list) => list.reduce((s, x) => s + x.rating, 0) / list.length;
  const trend = avg(dated.slice(half)) - avg(dated.slice(0, half));

  return { months, trend };
}

function buildReviewStats(albums) {
  const reviewed = albums.filter((a) => a.review?.trim());
  if (reviewed.length === 0) return null;
  const words = (t) => t.trim().split(/\s+/).length;
  const longest = reviewed.reduce((best, a) => (words(a.review) > words(best.review) ? a : best));
  return {
    count: reviewed.length,
    percent: Math.round((reviewed.length / albums.length) * 100),
    avgWords: Math.round(reviewed.reduce((s, a) => s + words(a.review), 0) / reviewed.length),
    longest,
    longestWords: words(longest.review),
  };
}

const RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];
const STATS_LIMIT = 120; // limita as leituras no Firestore: só os avaliados mais recentes entram na comparação
const MIN_COMMUNITY_VOTES = 2; // com 1 voto a "média" seria só a própria nota

function persona(diff) {
  if (diff >= 0.6) return { name: 'Coração mole', text: 'Você dá notas bem mais altas que a comunidade.' };
  if (diff >= 0.2) return { name: 'Otimista', text: 'Você é um pouco mais generoso que a média.' };
  if (diff > -0.2) return { name: 'Sintonizado', text: 'Suas notas andam junto com as da comunidade.' };
  if (diff > -0.6) return { name: 'Exigente', text: 'Você cobra mais dos álbuns que a média.' };
  return { name: 'Crítico severo', text: 'Suas notas são bem mais duras que as da comunidade.' };
}

async function loadStats(albums) {
  const result = new Map();
  const targets = albums.slice(0, STATS_LIMIT);
  for (let i = 0; i < targets.length; i += 25) {
    const chunk = targets.slice(i, i + 25);
    const stats = await Promise.all(chunk.map((a) => getAlbumStats(a.albumId).catch(() => null)));
    stats.forEach((s, idx) => {
      if (s && s.count >= MIN_COMMUNITY_VOTES) result.set(chunk[idx].albumId, s.average);
    });
  }
  return result;
}

export default function TasteXray({ albums }) {
  const [community, setCommunity] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadStats(albums).then((m) => !cancelled && setCommunity(m));
    return () => {
      cancelled = true;
    };
  }, [albums]);

  const summary = useMemo(() => {
    const total = albums.length;
    const average = total ? albums.reduce((s, a) => s + a.rating, 0) / total : 0;

    const counts = new Map();
    for (const a of albums) counts.set(a.rating, (counts.get(a.rating) || 0) + 1);
    const maxCount = Math.max(1, ...counts.values());

    const tagCounts = new Map();
    for (const a of albums) for (const t of a.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    return { total, average, counts, maxCount, topTags };
  }, [albums]);

  const calibration = useMemo(() => buildCalibration(albums), [albums]);
  const reviewStats = useMemo(() => buildReviewStats(albums), [albums]);

  const comparison = useMemo(() => {
    if (!community) return null;
    const rows = albums
      .filter((a) => community.has(a.albumId))
      .map((a) => ({ ...a, communityAvg: community.get(a.albumId), diff: a.rating - community.get(a.albumId) }));
    if (rows.length === 0) return { rows: [], avgDiff: 0 };
    const avgDiff = rows.reduce((s, r) => s + r.diff, 0) / rows.length;
    const hot = [...rows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 5);
    return { rows, avgDiff, hot };
  }, [albums, community]);

  if (albums.length === 0) {
    return <div className={styles.empty}>Avalie alguns álbuns e seu Raio-X aparece aqui.</div>;
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.label}>Sua nota média</span>
          <span className={styles.big}>{summary.average.toFixed(2)}</span>
          <span className={styles.muted}>em {summary.total} álbuns</span>
        </div>
        <div className={styles.bars}>
          {RATINGS.map((r) => {
            const count = summary.counts.get(r) || 0;
            return (
              <div key={r} className={styles.barRow}>
                <span className={styles.barLabel}>{r}★</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${(count / summary.maxCount) * 100}%` }} />
                </div>
                <span className={styles.barCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.card}>
        <span className={styles.label}>Você vs. comunidade</span>
        {!comparison ? (
          <div className={styles.loading}>
            <Spin size="small" /> comparando suas notas…
          </div>
        ) : comparison.rows.length === 0 ? (
          <p className={styles.muted}>
            Ainda não há álbuns seus avaliados por mais de uma pessoa pra comparar.
          </p>
        ) : (
          <>
            <div className={styles.persona}>
              <span className={styles.personaName}>{persona(comparison.avgDiff).name}</span>
              <span className={styles.muted}>
                {persona(comparison.avgDiff).text} Diferença média:{' '}
                {comparison.avgDiff > 0 ? '+' : ''}
                {comparison.avgDiff.toFixed(2)} estrelas em {comparison.rows.length} álbuns.
              </span>
            </div>

            <span className={`${styles.label} ${styles.subLabel}`}>Suas opiniões impopulares</span>
            <div className={styles.hotList}>
              {comparison.hot.map((r) => (
                <Link key={r.albumId} href={`/album/${r.albumId}`} className={styles.hotRow}>
                  {r.artwork ? <img src={r.artwork} alt="" className={styles.hotCover} /> : <div className={styles.hotCover} />}
                  <div className={styles.hotInfo}>
                    <div className={styles.hotTitle}>{r.albumTitle}</div>
                    <div className={styles.hotArtist}>{r.albumArtist}</div>
                  </div>
                  <div className={styles.hotNums}>
                    <span>você <b>{r.rating}</b></span>
                    <span className={styles.muted}>comunidade {r.communityAvg.toFixed(1)}</span>
                  </div>
                  <span className={`${styles.hotDiff} ${r.diff > 0 ? styles.up : styles.down}`}>
                    {r.diff > 0 ? '+' : ''}
                    {r.diff.toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {calibration && (
        <section className={styles.card}>
          <span className={styles.label}>Calibragem das suas notas</span>
          <p className={`${styles.muted} ${styles.calNote}`}>
            {Math.abs(calibration.trend) < 0.2
              ? 'Seu critério está estável: a média das notas recentes é parecida com a das primeiras.'
              : calibration.trend > 0
                ? `Atenção à inflação de notas: suas avaliações mais recentes têm média ${calibration.trend.toFixed(2)} estrela acima das primeiras.`
                : `Você ficou mais duro com o tempo: as avaliações recentes têm média ${Math.abs(calibration.trend).toFixed(2)} estrela abaixo das primeiras.`}
          </p>
          <div className={styles.months}>
            {calibration.months.map((m) => (
              <div key={m.label} className={styles.monthCol} title={`${m.n} álbuns`}>
                <span className={styles.monthAvg}>{m.avg.toFixed(1)}</span>
                <div className={styles.monthTrack}>
                  <div className={styles.monthFill} style={{ height: `${(m.avg / 5) * 100}%` }} />
                </div>
                <span className={styles.monthLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewStats && (
        <section className={styles.card}>
          <span className={styles.label}>Suas resenhas</span>
          <div className={styles.statRow}>
            <div>
              <span className={styles.big}>{reviewStats.count}</span>
              <span className={styles.muted}> resenhas ({reviewStats.percent}% dos álbuns)</span>
            </div>
            <div>
              <span className={styles.big}>{reviewStats.avgWords}</span>
              <span className={styles.muted}> palavras em média</span>
            </div>
          </div>
          <p className={`${styles.muted} ${styles.calNote}`}>
            Sua resenha mais longa é sobre{' '}
            <Link href={`/album/${reviewStats.longest.albumId}`} className={styles.inlineLink}>
              {reviewStats.longest.albumTitle}
            </Link>{' '}
            ({reviewStats.longestWords} palavras).
          </p>
        </section>
      )}

      <section className={styles.card}>
        <span className={styles.label}>Exportar suas avaliações</span>
        <p className={`${styles.muted} ${styles.calNote}`}>
          Leve suas notas, tags e resenhas pra fora: CSV pra planilha, Markdown pra blog ou newsletter.
        </p>
        <div className={styles.exportBtns}>
          <button type="button" className={styles.exportBtn} onClick={() => exportRatingsCsv(albums)}>
            <Download size={14} /> CSV
          </button>
          <button type="button" className={styles.exportBtn} onClick={() => exportRatingsMarkdown(albums)}>
            <Download size={14} /> Markdown
          </button>
        </div>
      </section>

      {summary.topTags.length > 0 && (
        <section className={styles.card}>
          <span className={styles.label}>Suas tags mais usadas</span>
          <div className={styles.tags}>
            {summary.topTags.map(([tag, n]) => (
              <span key={tag} className={styles.tag}>
                {tag} <span className={styles.muted}>{n}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
