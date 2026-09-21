// src/app/admin/page.jsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Spin } from 'antd';
import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isAdminEmail } from '../lib/admin';
import { dayKey } from '../lib/analytics';
import {
  daysAgoKey,
  loadActiveVisitors,
  loadContentTotals,
  loadDaily,
  loadSignups,
  loadTops,
} from '../lib/adminStats';
import {
  apiRoutes,
  bucketRows,
  delta,
  fillDays,
  fmtDuration,
  fmtNum,
  hourDistribution,
  rank,
  sumDocs,
  weekdayDistribution,
  withDerived,
} from '../lib/adminAggregate';
import styles from './page.module.css';

const RANGES = [
  { id: '1', label: 'Hoje', days: 1, gran: 'day' },
  { id: '7', label: '7 dias', days: 7, gran: 'day' },
  { id: '30', label: '30 dias', days: 30, gran: 'day' },
  { id: '90', label: '90 dias', days: 90, gran: 'week' },
  { id: '365', label: '1 ano', days: 365, gran: 'month' },
  { id: 'all', label: 'Tudo', days: null, gran: 'month' },
];

const GRANULARITIES = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'year', label: 'Ano' },
];

const METRICS = [
  { id: 'uniqueVisitors', label: 'Visitantes únicos' },
  { id: 'pageViews', label: 'Pageviews' },
  { id: 'sessions', label: 'Sessões' },
  { id: 'signups', label: 'Cadastros' },
  { id: 'apiCount', label: 'Requisições de API' },
  { id: 'apiErrors', label: 'Erros de API' },
  { id: 'jsErrors', label: 'Erros de JavaScript' },
];

function Kpi({ label, value, change, hint }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
      {change !== null && change !== undefined && (
        <span className={change >= 0 ? styles.up : styles.down}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}% vs. período anterior
        </span>
      )}
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  );
}

function BarChart({ data, format = fmtNum }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = Math.ceil(data.length / 12);
  return (
    <div className={styles.chart}>
      {data.map((d, i) => (
        <div key={d.key || d.label} className={styles.chartCol} title={`${d.label}: ${format(d.value)}`}>
          <div className={styles.chartTrack}>
            <div className={styles.chartFill} style={{ height: `${(d.value / max) * 100}%` }} />
          </div>
          <span className={styles.chartLabel}>{i % step === 0 ? d.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

function RankList({ items, limit = 10, empty = 'Sem dados ainda.' }) {
  const shown = items.slice(0, limit);
  const total = items.reduce((s, i) => s + i.value, 0);
  const max = Math.max(1, ...shown.map((i) => i.value));
  if (shown.length === 0) return <p className={styles.muted}>{empty}</p>;
  return (
    <div className={styles.rank}>
      {shown.map((item) => (
        <div key={item.label} className={styles.rankRow}>
          <div className={styles.rankTop}>
            <span className={styles.rankLabel}>{item.label}</span>
            <span className={styles.rankValue}>
              {fmtNum(item.value)} <span className={styles.muted}>({total ? Math.round((item.value / total) * 100) : 0}%)</span>
            </span>
          </div>
          <div className={styles.rankTrack}>
            <div className={styles.rankFill} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children, wide }) {
  return (
    <section className={`${styles.card} ${wide ? styles.wide : ''}`}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

function formatTs(ts) {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminPage() {
  const { user, loadingUser } = useAuth();
  const isAdmin = !!user && isAdminEmail(user.email) && user.emailVerified;

  const [rangeId, setRangeId] = useState('30');
  const [granularity, setGranularity] = useState('day');
  const [metric, setMetric] = useState('uniqueVisitors');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rows, setRows] = useState([]); // período atual, um item por dia
  const [prevTotal, setPrevTotal] = useState(null);
  const [active, setActive] = useState(null);
  const [content, setContent] = useState(null);
  const [tops, setTops] = useState(null);

  const range = RANGES.find((r) => r.id === rangeId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = dayKey();
      const startKey = range.days ? daysAgoKey(range.days - 1) : '2000-01-01';
      const prevStartKey = range.days ? daysAgoKey(range.days * 2 - 1) : null;

      const [daily, activeCounts, totals, topLists, signups] = await Promise.all([
        loadDaily(prevStartKey || startKey),
        loadActiveVisitors(),
        loadContentTotals(),
        loadTops(),
        loadSignups(range.days ? Date.now() - range.days * 86_400_000 : 0).catch(() => ({})),
      ]);

      const current = daily.filter((d) => d.day >= startKey);
      const previous = prevStartKey ? daily.filter((d) => d.day < startKey) : [];
      const firstDay = range.days ? startKey : current[0]?.day || today;

      setRows(fillDays(current, firstDay, today, signups));
      setPrevTotal(previous.length ? withDerived(sumDocs(previous)) : null);
      setActive(activeCounts);
      setContent(totals);
      setTops(topLists);
    } catch (err) {
      setError(err?.code === 'permission-denied' ? 'permission' : 'generic');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  function pickRange(id) {
    setRangeId(id);
    setGranularity(RANGES.find((r) => r.id === id).gran);
  }

  const total = useMemo(() => withDerived(sumDocs(rows)), [rows]);
  const series = useMemo(() => bucketRows(rows, granularity), [rows, granularity]);
  const chartData = series.map((b) => ({ key: b.key, label: b.label, value: b[metric] || 0 }));
  const routes = useMemo(() => apiRoutes(total.api), [total]);
  const hasData = total.pageViews > 0 || total.apiCount > 0;

  if (loadingUser) {
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAdmin) {
    const needsVerify = !!user && isAdminEmail(user.email) && !user.emailVerified;
    return (
      <div className={styles.center}>
        <div className={styles.denied}>
          <h1>Acesso restrito</h1>
          <p className={styles.muted}>
            {needsVerify
              ? 'Verifique o e-mail desta conta pra acessar o painel.'
              : 'Esta área é só pra administradores.'}
          </p>
          <Link href="/" className={styles.link}>
            voltar pra home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> voltar
      </Link>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Painel administrativo</h1>
          <p className={styles.muted}>Fuso: America/Sao_Paulo · dados coletados a partir da ativação do rastreio</p>
        </div>
        <button type="button" className={styles.refresh} onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? styles.spin : ''} /> Atualizar
        </button>
      </header>

      {error && (
        <div className={styles.alert}>
          <TriangleAlert size={18} />
          <div>
            {error === 'permission' ? (
              <>
                <b>O Firestore bloqueou a leitura.</b> Publique as regras de{' '}
                <code>firestore-analytics.rules</code> (raiz do projeto) no console do Firebase e recarregue.
              </>
            ) : (
              <b>Não consegui carregar os dados. Tente atualizar.</b>
            )}
          </div>
        </div>
      )}

      {/* Agora / janelas móveis */}
      <div className={styles.kpiGrid}>
        <Kpi label="Online agora" value={fmtNum(active?.online)} hint="últimos 5 min" />
        <Kpi label="Ativos em 24h" value={fmtNum(active?.day)} />
        <Kpi label="Ativos em 7 dias" value={fmtNum(active?.week)} />
        <Kpi label="Ativos em 30 dias" value={fmtNum(active?.month)} />
        <Kpi label="Ativos em 1 ano" value={fmtNum(active?.year)} />
        <Kpi label="Navegadores já vistos" value={fmtNum(active?.total)} hint="total histórico" />
      </div>

      {/* Filtros */}
      <div className={styles.toolbar}>
        <div className={styles.chips}>
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.chip} ${rangeId === r.id ? styles.chipActive : ''}`}
              onClick={() => pickRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className={styles.chips}>
          <span className={styles.muted}>Agrupar por</span>
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`${styles.chip} ${granularity === g.id ? styles.chipActive : ''}`}
              onClick={() => setGranularity(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !rows.length ? (
        <div className={styles.center} style={{ minHeight: 200 }}>
          <Spin />
        </div>
      ) : (
        <>
          {!hasData && (
            <div className={styles.notice}>
              Ainda não há dados de tráfego neste período. O rastreio começa a valer assim que as regras do Firestore
              forem publicadas e as pessoas navegarem no site.
            </div>
          )}

          <div className={styles.kpiGrid}>
            <Kpi
              label="Visitantes únicos"
              value={fmtNum(total.uniqueVisitors)}
              change={delta(total.uniqueVisitors || 0, prevTotal?.uniqueVisitors)}
              hint="soma dos únicos de cada dia"
            />
            <Kpi label="Pageviews" value={fmtNum(total.pageViews)} change={delta(total.pageViews || 0, prevTotal?.pageViews)} />
            <Kpi label="Sessões" value={fmtNum(total.sessions)} change={delta(total.sessions || 0, prevTotal?.sessions)} />
            <Kpi label="Páginas por sessão" value={(total.pagesPerSession || 0).toFixed(1)} />
            <Kpi label="Tempo ativo médio" value={fmtDuration(total.avgSessionSeconds)} hint="por sessão" />
            <Kpi label="Novos cadastros" value={fmtNum(total.signups)} change={null} />
            <Kpi
              label="Requisições de API"
              value={fmtNum(total.apiCount)}
              change={delta(total.apiCount || 0, prevTotal?.apiCount)}
            />
            <Kpi
              label="Erros de API"
              value={fmtNum(total.apiErrors)}
              hint={total.apiCount ? `${((total.apiErrors / total.apiCount) * 100).toFixed(1)}% das requisições` : ''}
            />
            <Kpi label="Latência média das APIs" value={`${Math.round(total.apiAvgMs || 0)} ms`} />
            <Kpi label="Erros de JavaScript" value={fmtNum(total.jsErrors)} />
          </div>

          <Card title="Evolução" wide>
            <div className={styles.chips} style={{ marginBottom: 14 }}>
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.chip} ${metric === m.id ? styles.chipActive : ''}`}
                  onClick={() => setMetric(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <BarChart data={chartData} />
          </Card>

          <Card title="Detalhe por período" wide>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Visitantes</th>
                    <th>Pageviews</th>
                    <th>Sessões</th>
                    <th>Tempo médio</th>
                    <th>Cadastros</th>
                    <th>Req. API</th>
                    <th>Erros API</th>
                    <th>Erros JS</th>
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map((b) => (
                    <tr key={b.key}>
                      <td>{b.label}</td>
                      <td>{fmtNum(b.uniqueVisitors)}</td>
                      <td>{fmtNum(b.pageViews)}</td>
                      <td>{fmtNum(b.sessions)}</td>
                      <td>{fmtDuration(b.avgSessionSeconds)}</td>
                      <td>{fmtNum(b.signups)}</td>
                      <td>{fmtNum(b.apiCount)}</td>
                      <td>{fmtNum(b.apiErrors)}</td>
                      <td>{fmtNum(b.jsErrors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className={styles.grid}>
            <Card title="Requisições por API" wide>
              {routes.length === 0 ? (
                <p className={styles.muted}>Nenhuma chamada de API registrada no período.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Rota</th>
                        <th>Requisições</th>
                        <th>Erros</th>
                        <th>Taxa de erro</th>
                        <th>Latência média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.map((r) => (
                        <tr key={r.route}>
                          <td className={styles.mono}>{r.route}</td>
                          <td>{fmtNum(r.count)}</td>
                          <td>{fmtNum(r.errors)}</td>
                          <td className={r.errors / r.count > 0.05 ? styles.down : ''}>
                            {((r.errors / r.count) * 100).toFixed(1)}%
                          </td>
                          <td>{Math.round(r.avgMs)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={styles.footnote}>
                Conta as chamadas às rotas <code>/api/*</code> feitas pelo site no navegador do usuário.
              </p>
            </Card>

            <Card title="Páginas mais vistas">
              <RankList items={rank(total.paths)} limit={15} />
            </Card>
            <Card title="Origem do tráfego">
              <RankList items={rank(total.referrers)} />
            </Card>

            <Card title="Horário de pico (pageviews por hora)" wide>
              <BarChart data={hourDistribution(total.hours)} />
            </Card>
            <Card title="Dia da semana (pageviews)">
              <BarChart data={weekdayDistribution(rows)} />
            </Card>
            <Card title="Logados vs. anônimos">
              <RankList
                items={[
                  { label: 'Logados', value: total.loggedInVisitors || 0 },
                  { label: 'Anônimos', value: total.anonVisitors || 0 },
                ]}
              />
            </Card>
            <Card title="Novos vs. recorrentes">
              <RankList
                items={[
                  { label: 'Novos', value: total.newVisitors || 0 },
                  { label: 'Recorrentes', value: total.returningVisitors || 0 },
                ]}
              />
            </Card>

            <Card title="Aparelhos">
              <RankList items={rank(total.devices)} />
            </Card>
            <Card title="Navegadores">
              <RankList items={rank(total.browsers)} />
            </Card>
            <Card title="Sistemas operacionais">
              <RankList items={rank(total.os)} />
            </Card>
            <Card title="Idiomas">
              <RankList items={rank(total.langs)} />
            </Card>

            <Card title="Erros de JavaScript mais comuns" wide>
              <RankList items={rank(total.errorMsgs)} empty="Nenhum erro registrado. 🎉" />
            </Card>
          </div>

          <h2 className={styles.sectionHeading}>Conteúdo e comunidade</h2>
          <div className={styles.kpiGrid}>
            <Kpi label="Usuários cadastrados" value={fmtNum(content?.users)} />
            <Kpi label="Avaliações de álbuns" value={content?.ratings == null ? 'n/d' : fmtNum(content.ratings)} />
            <Kpi label="Álbuns avaliados" value={fmtNum(content?.albumsRated)} hint="distintos" />
            <Kpi label="Faixas avaliadas" value={fmtNum(content?.tracksRated)} hint="distintas" />
            <Kpi label="Listas" value={fmtNum(content?.lists)} />
            <Kpi label="Tier lists" value={fmtNum(content?.tierLists)} />
            <Kpi label="Perguntas na comunidade" value={fmtNum(content?.questions)} />
            <Kpi label="Comentários" value={fmtNum(content?.comments)} />
          </div>

          <div className={styles.grid}>
            <Card title="Álbuns mais avaliados">
              <RankList
                items={(tops?.albums || []).map((a) => ({ label: `${a.albumTitle} — ${a.albumArtist}`, value: a.count || 0 }))}
              />
            </Card>
            <Card title="Usuários mais ativos (avaliações)">
              <RankList
                items={(tops?.users || []).map((u) => ({ label: u.displayName || u.email || u.id, value: u.ratingsCount || 0 }))}
              />
            </Card>

            <Card title="Últimos cadastros" wide>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Cadastro</th>
                      <th>Avaliações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tops?.recentUsers || []).map((u) => (
                      <tr key={u.id}>
                        <td>
                          <Link href={`/profile/${u.id}`} className={styles.link}>
                            {u.displayName || 'Sem nome'}
                          </Link>
                        </td>
                        <td>{u.email}</td>
                        <td>{formatTs(u.createdAt)}</td>
                        <td>{fmtNum(u.ratingsCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.footnote}>
                Usuários que entram com Google podem ter a data de cadastro sobrescrita a cada login (o AuthContext
                regrava <code>createdAt</code>).
              </p>
            </Card>

            <Card title="Visitantes recentes" wide>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Quando</th>
                      <th>Quem</th>
                      <th>Aparelho</th>
                      <th>Navegador / SO</th>
                      <th>Idioma</th>
                      <th>Última página</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tops?.visitors || []).map((v) => (
                      <tr key={v.id}>
                        <td>{formatTs(v.lastSeen)}</td>
                        <td>{v.name || (v.uid ? 'Usuário logado' : 'Anônimo')}</td>
                        <td>{v.device}</td>
                        <td>
                          {v.browser} / {v.os}
                        </td>
                        <td>{v.lang}</td>
                        <td className={styles.mono}>{v.lastPath}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
