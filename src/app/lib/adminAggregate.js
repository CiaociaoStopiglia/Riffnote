// src/app/lib/adminAggregate.js
// Funções puras que transformam os documentos diários em séries/rankings pro painel.

const DAY_MS = 86_400_000;

export function keyToDate(key) {
  return new Date(`${key}T12:00:00Z`);
}

function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

/** Soma recursiva de todos os campos numéricos (inclusive mapas aninhados). */
export function sumDocs(rows) {
  const out = {};
  const add = (into, from) => {
    for (const [k, v] of Object.entries(from)) {
      if (typeof v === 'number') {
        into[k] = (into[k] || 0) + v;
      } else if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.seconds !== 'number') {
        if (!into[k]) into[k] = {};
        add(into[k], v);
      }
    }
  };
  for (const row of rows) add(out, row);
  return out;
}

/** Garante uma linha por dia entre start e end (dias sem tráfego viram zeros). */
export function fillDays(rows, startKey, endKey, extraByDay = {}) {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out = [];
  for (let t = keyToDate(startKey).getTime(); t <= keyToDate(endKey).getTime(); t += DAY_MS) {
    const key = dateToKey(new Date(t));
    out.push({ ...(byDay.get(key) || {}), day: key, signups: extraByDay[key] || 0 });
  }
  return out;
}

export function bucketKey(day, granularity) {
  if (granularity === 'year') return day.slice(0, 4);
  if (granularity === 'month') return day.slice(0, 7);
  if (granularity === 'week') {
    const date = keyToDate(day);
    const sinceMonday = (date.getUTCDay() + 6) % 7;
    return dateToKey(new Date(date.getTime() - sinceMonday * DAY_MS));
  }
  return day;
}

export function bucketLabel(key, granularity) {
  if (granularity === 'year') return key;
  if (granularity === 'month') return `${key.slice(5)}/${key.slice(0, 4)}`;
  const [, m, d] = key.split('-');
  return granularity === 'week' ? `sem ${d}/${m}` : `${d}/${m}`;
}

export function bucketRows(rows, granularity) {
  const groups = new Map();
  for (const row of rows) {
    const key = bucketKey(row.day, granularity);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, list]) => {
      const total = sumDocs(list);
      return { key, label: bucketLabel(key, granularity), ...withDerived(total) };
    });
}

/** Campos calculados a partir dos somados (requisições de API, erros, tempo médio). */
export function withDerived(total) {
  const api = Object.values(total.api || {});
  const apiCount = api.reduce((s, a) => s + (a.count || 0), 0);
  const apiErrors = api.reduce((s, a) => s + (a.errors || 0), 0);
  const apiMs = api.reduce((s, a) => s + (a.totalMs || 0), 0);
  return {
    ...total,
    apiCount,
    apiErrors,
    apiAvgMs: apiCount ? apiMs / apiCount : 0,
    avgSessionSeconds: total.sessions ? (total.activeSeconds || 0) / total.sessions : 0,
    pagesPerSession: total.sessions ? (total.pageViews || 0) / total.sessions : 0,
  };
}

/** Mapa {rótulo: número} -> lista ordenada decrescente. */
export function rank(map = {}) {
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function apiRoutes(apiMap = {}) {
  return Object.entries(apiMap)
    .map(([route, v]) => ({
      route,
      count: v.count || 0,
      errors: v.errors || 0,
      avgMs: v.count ? (v.totalMs || 0) / v.count : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function weekdayDistribution(rows) {
  const totals = Array(7).fill(0);
  for (const r of rows) totals[keyToDate(r.day).getUTCDay()] += r.pageViews || 0;
  return WEEKDAYS.map((label, i) => ({ label, value: totals[i] }));
}

export function hourDistribution(hoursMap = {}) {
  return Array.from({ length: 24 }, (_, h) => {
    const key = String(h).padStart(2, '0');
    return { label: key, value: hoursMap[key] || 0 };
  });
}

export function delta(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export const fmtNum = (n) => Math.round(n || 0).toLocaleString('pt-BR');

export function fmtDuration(seconds) {
  const s = Math.round(seconds || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}
