// src/app/lib/analytics.js
//
// Coletor de métricas do Riffnote (roda só no navegador).
//
// Em vez de gravar 1 documento por clique, acumula contadores em memória e
// grava agregados por dia, com increment():
//   analyticsDaily/{YYYY-MM-DD}  -> visitas, pageviews, sessões, APIs, erros…
//   analyticsVisitors/{visitorId} -> 1 doc por navegador (última visita, aparelho…)
// Isso mantém o custo de escrita baixo (~1 escrita por minuto de uso ativo).
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const TZ = 'America/Sao_Paulo';
const FLUSH_MS = 60_000;
const SESSION_GAP_MS = 30 * 60_000;
const VISITOR_WRITE_MS = 3 * 60_000;
const IDLE_LIMIT_MS = 60_000;

export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function hourKey(date = new Date()) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(date);
  return String(Number(h)).padStart(2, '0');
}

// Agrupa rotas dinâmicas (/album/123 -> /album/:id) pra não gerar 1 chave por álbum.
const DYNAMIC_ROUTES = [
  [/^\/album\/[^/]+$/, '/album/:id'],
  [/^\/artista\/[^/]+$/, '/artista/:id'],
  [/^\/lista\/[^/]+$/, '/lista/:id'],
  [/^\/tierlist\/[^/]+$/, '/tierlist/:id'],
  [/^\/comunidade\/pergunta\/[^/]+$/, '/comunidade/pergunta/:id'],
  [/^\/profile\/[^/]+\/albuns$/, '/profile/:uid/albuns'],
  [/^\/profile\/(?!albuns$)[^/]+$/, '/profile/:uid'],
];

export function normalizePath(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  for (const [re, label] of DYNAMIC_ROUTES) if (re.test(clean)) return label;
  return clean;
}

function parseUA(ua = '') {
  const device = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Outro';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad|iOS/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Outro';
  return { device, browser, os };
}

function referrerHost() {
  try {
    if (!document.referrer) return 'direto';
    const host = new URL(document.referrer).host;
    return host === location.host ? 'direto' : host;
  } catch {
    return 'direto';
  }
}

// ---- storage seguro (localStorage pode falhar em aba anônima) ----
function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ---- estado em memória ----
function emptyPending() {
  return {
    pageViews: 0,
    sessions: 0,
    activeSeconds: 0,
    uniqueVisitors: 0,
    newVisitors: 0,
    returningVisitors: 0,
    loggedInVisitors: 0,
    anonVisitors: 0,
    jsErrors: 0,
    paths: {},
    hours: {},
    devices: {},
    browsers: {},
    os: {},
    referrers: {},
    langs: {},
    api: {},
    errorMsgs: {},
  };
}

let pending = emptyPending();
let dirty = false;
let currentUser = null;
let lastInteraction = Date.now();
let lastVisitorWrite = 0;
let visitorId = null;
let visitorIsNew = false;
let lastPathSeen = '/';

function bump(target, key, n = 1) {
  const safe = String(key || 'desconhecido').slice(0, 100);
  target[safe] = (target[safe] || 0) + n;
  dirty = true;
}

function getVisitorId() {
  if (visitorId) return visitorId;
  let id = lsGet('rn_vid');
  if (!id) {
    id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    lsSet('rn_vid', id);
    visitorIsNew = true;
  }
  visitorId = id;
  return id;
}

function toIncrements(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') {
      if (v) out[k] = increment(v);
    } else if (v && typeof v === 'object') {
      const nested = toIncrements(v);
      if (Object.keys(nested).length) out[k] = nested;
    }
  }
  return out;
}

async function writeVisitor(force = false) {
  const now = Date.now();
  if (!force && now - lastVisitorWrite < VISITOR_WRITE_MS) return;
  lastVisitorWrite = now;

  const ua = parseUA(navigator.userAgent);
  const data = {
    lastSeen: serverTimestamp(),
    lastPath: lastPathSeen,
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
    lang: navigator.language || '',
    uid: currentUser?.uid || null,
    name: currentUser?.displayName || null,
  };
  if (visitorIsNew) {
    data.firstSeen = serverTimestamp();
    visitorIsNew = false;
  }
  try {
    await setDoc(doc(db, 'analyticsVisitors', getVisitorId()), data, { merge: true });
  } catch {}
}

async function flush() {
  if (!dirty) return;
  const snapshot = pending;
  pending = emptyPending();
  dirty = false;
  try {
    await setDoc(doc(db, 'analyticsDaily', dayKey()), toIncrements(snapshot), { merge: true });
  } catch {
    // Falhou (offline/regras): devolve os contadores pra tentar de novo no próximo ciclo.
    mergeBack(snapshot);
  }
  writeVisitor();
}

function mergeBack(snapshot) {
  const merge = (into, from) => {
    for (const [k, v] of Object.entries(from)) {
      if (typeof v === 'number') {
        into[k] = (into[k] || 0) + v;
      } else if (v && typeof v === 'object') {
        if (!into[k]) into[k] = {};
        merge(into[k], v);
      }
    }
  };
  merge(pending, snapshot);
  dirty = true;
}

// ---- API pública do coletor ----
export function setTrackedUser(user) {
  currentUser = user || null;
}

export function trackPageView(pathname) {
  const path = normalizePath(pathname);
  if (path.startsWith('/admin')) return; // o próprio painel não conta como tráfego
  lastPathSeen = path;

  const now = Date.now();
  getVisitorId();
  const today = dayKey();

  // Nova sessão = primeira visita ou mais de 30 min parado.
  const lastActivity = Number(lsGet('rn_session_last') || 0);
  const newSession = !lastActivity || now - lastActivity > SESSION_GAP_MS;
  if (newSession) {
    pending.sessions += 1;
    bump(pending.referrers, referrerHost());
  }
  lsSet('rn_session_last', String(now));

  // Primeira visita do dia deste navegador = visitante único do dia.
  if (lsGet('rn_last_day') !== today) {
    lsSet('rn_last_day', today);
    const ua = parseUA(navigator.userAgent);
    pending.uniqueVisitors += 1;
    if (visitorIsNew) pending.newVisitors += 1;
    else pending.returningVisitors += 1;
    if (currentUser) pending.loggedInVisitors += 1;
    else pending.anonVisitors += 1;
    bump(pending.devices, ua.device);
    bump(pending.browsers, ua.browser);
    bump(pending.os, ua.os);
    bump(pending.langs, (navigator.language || 'desconhecido').slice(0, 5));
  }

  pending.pageViews += 1;
  bump(pending.paths, path);
  bump(pending.hours, hourKey());
  dirty = true;

  writeVisitor(newSession || visitorIsNew);
}

function recordApi(pathname, failed, ms) {
  const route = pathname.slice(0, 100);
  if (!pending.api[route]) pending.api[route] = { count: 0, errors: 0, totalMs: 0 };
  const entry = pending.api[route];
  entry.count += 1;
  entry.totalMs += Math.round(ms);
  if (failed) entry.errors += 1;
  dirty = true;
}

function patchFetch() {
  if (window.__rnFetchPatched) return;
  window.__rnFetchPatched = true;
  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    let url = null;
    try {
      url = new URL(typeof input === 'string' ? input : input?.url || String(input), location.origin);
    } catch {}
    if (!url || url.origin !== location.origin || !url.pathname.startsWith('/api/')) {
      return original(input, init);
    }

    const start = performance.now();
    try {
      const res = await original(input, init);
      recordApi(url.pathname, res.status >= 400, performance.now() - start);
      return res;
    } catch (err) {
      recordApi(url.pathname, true, performance.now() - start);
      throw err;
    }
  };
}

export function startTracking() {
  patchFetch();

  const onInteract = () => {
    lastInteraction = Date.now();
  };
  const interactionEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  for (const e of interactionEvents) window.addEventListener(e, onInteract, { passive: true });

  const onError = (event) => {
    pending.jsErrors += 1;
    if (Object.keys(pending.errorMsgs).length < 20) bump(pending.errorMsgs, event.message || 'erro sem mensagem');
    dirty = true;
  };
  const onRejection = (event) => {
    pending.jsErrors += 1;
    const msg = event.reason?.message || String(event.reason || 'promise rejeitada');
    if (Object.keys(pending.errorMsgs).length < 20) bump(pending.errorMsgs, msg);
    dirty = true;
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);

  // A cada ciclo: soma tempo ativo (aba visível + interação recente) e grava.
  const timer = setInterval(() => {
    const now = Date.now();
    if (document.visibilityState === 'visible' && now - lastInteraction < IDLE_LIMIT_MS) {
      pending.activeSeconds += FLUSH_MS / 1000;
      dirty = true;
      lsSet('rn_session_last', String(now));
    }
    flush();
  }, FLUSH_MS);

  return () => {
    clearInterval(timer);
    for (const e of interactionEvents) window.removeEventListener(e, onInteract);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    document.removeEventListener('visibilitychange', onHide);
    flush();
  };
}
