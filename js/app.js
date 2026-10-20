// hq entry point: theme, header, and the four sections (cached → fresh).
import { REFRESH_INTERVAL, ETF_CONFIG, REGIME_CONFIG } from './config.js';
import { initTheme } from './theme.js';
import { loadMarkets, renderMarkets } from './markets.js';
import { renderChart } from './chart.js';
import { loadRegime, renderRegime } from './regime.js';
import { loadPredictions, renderPredictions } from './predictions.js';
import { loadNews, renderNews } from './news.js';

// Regular sessions, local exchange time (weekdays; holidays not modelled).
const EXCHANGES = [
  { label: 'paris', tz: 'Europe/Paris', open: 540, close: 1050 },
  { label: 'ny', tz: 'America/New_York', open: 570, close: 960 },
];

function isOpen(x, now) {
  try {
    const t = new Date(now.toLocaleString('en-US', { timeZone: x.tz }));
    const mins = t.getHours() * 60 + t.getMinutes();
    return t.getDay() >= 1 && t.getDay() <= 5 && mins >= x.open && mins < x.close;
  } catch {
    return false;
  }
}

const STORE_KEY = 'hq-data';
const STALE_AFTER = 2 * 60 * 1000; // refetch on return to the tab if older than this
let updatedAt = 0;
let busy = false;

function updateHeader() {
  const now = new Date();
  const el = document.getElementById('headerMeta');
  el.textContent = '';
  const date = document.createElement('span');
  date.className = 'date';
  date.textContent = now
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase();
  el.appendChild(date);
  EXCHANGES.forEach((x) => {
    const open = isOpen(x, now);
    const s = document.createElement('span');
    s.className = 'xch';
    s.title = x.label + (open ? ' open' : ' closed');
    const dot = document.createElement('span');
    dot.className = 'sdot' + (open ? ' open' : '');
    s.appendChild(dot);
    s.appendChild(document.createTextNode(x.label));
    el.appendChild(s);
  });
}

function updateStatus() {
  const btn = document.getElementById('refresh');
  if (busy) {
    btn.textContent = 'updating…';
  } else if (updatedAt) {
    const age = Date.now() - updatedAt;
    const hm = new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    btn.textContent = age > 86400000 ? 'updated ' + Math.round(age / 86400000) + 'd ago' : 'updated ' + hm;
  } else {
    btn.textContent = 'refresh';
  }
  btn.disabled = busy;
}

// Last good data per section, so the page paints instantly on open.
function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeStore(key, value) {
  try {
    const all = readStore();
    all[key] = value;
    all.at = Date.now();
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode — ignore */
  }
}

// Regime items carry their config (with a format function); store by label only.
const regimeOut = (items) => items.map(({ cfg, price, prev }) => ({ label: cfg.label, price, prev }));
const regimeIn = (items) =>
  items
    .map((d) => (d.cfg ? d : { ...d, cfg: REGIME_CONFIG.find((c) => c.label === d.label) }))
    .filter((d) => d.cfg);

// Stream feeds in as they land, but only when that beats what's on screen
// (a cached full list shouldn't be swapped for one fast feed).
function loadNewsProgressive() {
  const streaming = !document.querySelector('#newsList .row');
  return loadNews((partial) => {
    if (streaming) renderNews(partial);
  });
}

const SECTIONS = [
  {
    key: 'etf',
    el: 'etfList',
    load: loadMarkets,
    render: (d) => {
      renderMarkets(d);
      renderChart(d, ETF_CONFIG);
    },
  },
  { key: 'regime', load: loadRegime, render: (d) => renderRegime(regimeIn(d)), save: regimeOut },
  { key: 'pred', el: 'predList', load: loadPredictions, render: renderPredictions },
  { key: 'news', el: 'newsList', load: loadNewsProgressive, render: renderNews },
];

function paintCached() {
  const store = readStore();
  SECTIONS.forEach((s) => {
    const d = store[s.key];
    if (d && d.length) {
      try {
        s.render(d);
      } catch {
        /* old shape — fresh data will replace it */
      }
    }
  });
  updatedAt = store.at || 0;
}

// Each section renders as soon as its own data lands; one slow source never holds the rest.
async function loadAll() {
  if (busy) return;
  busy = true;
  updateHeader();
  updateStatus();
  let any = false;
  await Promise.allSettled(
    SECTIONS.map(async (s) => {
      try {
        const d = await s.load();
        if (!d || !d.length) throw new Error('empty');
        s.render(d);
        writeStore(s.key, s.save ? s.save(d) : d);
        any = true;
      } catch {
        // Keep whatever is on screen; never show made-up numbers.
        const el = s.el && document.getElementById(s.el);
        if (el && !el.querySelector('.row')) {
          el.innerHTML = '<div class="loading">unavailable</div>';
        }
      }
    }),
  );
  if (any) updatedAt = Date.now();
  busy = false;
  updateStatus();
}

initTheme();
updateHeader();
paintCached();
loadAll();
setInterval(loadAll, REFRESH_INTERVAL);
setInterval(updateHeader, 60 * 1000);
document.getElementById('refresh').addEventListener('click', loadAll);
// Phones suspend background tabs: catch up when the app comes back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - updatedAt > STALE_AFTER) loadAll();
});

// Installable PWA: offline shell (data always fetched fresh).
if (
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1')
) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
