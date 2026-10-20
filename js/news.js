// Reading: one time-sorted stream from a few RSS feeds (via proxy) + HN (direct).
// A quiet filter row narrows it; a dot marks what's new since your last visit.
import { NEWS_FEEDS, NEWS_FILTERS } from './config.js';
import { proxyText } from './proxy.js';

const HN_API = 'https://hn.algolia.com/api/v1/search?tags=front_page';
const SEEN_KEY = 'hq-last-visit';
const FILTER_KEY = 'hq-news-filter';
const PER_SOURCE = 3; // in "all", so no single feed floods the list
const LIMIT = 8;

// Previous visit. Pinned per tab session so reloads don't wipe the markers;
// first visit ever: the last hour counts as new.
const lastVisit = (() => {
  let base = null;
  try {
    base =
      Number(sessionStorage.getItem(SEEN_KEY)) ||
      Number(localStorage.getItem(SEEN_KEY)) ||
      Date.now() - 3600000;
    sessionStorage.setItem(SEEN_KEY, String(base));
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* private mode — ignore */
  }
  return base || Date.now() - 3600000;
})();

let filter = (() => {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return NEWS_FILTERS.some((x) => x.id === f) ? f : 'all';
  } catch {
    return 'all';
  }
})();
let cache = [];

function relTime(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

async function loadFeed(feed) {
  const xml = await proxyText(feed.url, 12000);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return [...doc.querySelectorAll('item')]
    .slice(0, 15)
    .map((it) => {
      const title = ((it.querySelector('title') || {}).textContent || '').trim();
      const url = ((it.querySelector('link') || {}).textContent || '').trim();
      const t = new Date((it.querySelector('pubDate') || {}).textContent || '').getTime();
      if (!title || !url || Number.isNaN(t)) return null;
      if (feed.skip && feed.skip.test(url)) return null;
      return { title, url, t, src: feed.src, cat: feed.cat };
    })
    .filter(Boolean);
}

async function loadHN() {
  const res = await fetch(HN_API, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('hn ' + res.status);
  const j = await res.json();
  return (j.hits || []).slice(0, 5).map((h) => ({
    title: h.title,
    url: h.url || 'https://news.ycombinator.com/item?id=' + h.objectID,
    t: (h.created_at_i || 0) * 1000,
    src: 'HN',
    cat: 'tech',
    detail: (h.points || 0) + ' pts',
  }));
}

function merge(batches) {
  const seen = new Set();
  return batches
    .flat()
    .filter((n) => !seen.has(n.url) && (seen.add(n.url), true))
    .sort((a, b) => b.t - a.t);
}

/** onPartial(items) fires as each feed lands, so one slow feed doesn't hold the list. */
export async function loadNews(onPartial) {
  const batches = [];
  const jobs = [...NEWS_FEEDS.map(loadFeed), loadHN()];
  await Promise.allSettled(
    jobs.map((j, i) =>
      j.then((items) => {
        batches[i] = items;
        if (onPartial) onPartial(merge(batches.filter(Boolean)));
      }),
    ),
  );
  const out = merge(batches.filter(Boolean));
  if (!out.length) throw new Error('news unavailable');
  return out;
}

function pick(items) {
  if (filter !== 'all') return items.filter((n) => n.cat === filter).slice(0, LIMIT);
  const count = {};
  return items.filter((n) => (count[n.src] = (count[n.src] || 0) + 1) <= PER_SOURCE).slice(0, LIMIT);
}

function renderFilters() {
  const el = document.getElementById('newsFilters');
  if (!el) return;
  el.innerHTML = '';
  NEWS_FILTERS.forEach((f) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = f.label;
    b.setAttribute('aria-pressed', String(f.id === filter));
    b.addEventListener('click', () => {
      filter = f.id;
      try {
        localStorage.setItem(FILTER_KEY, filter);
      } catch {
        /* ignore */
      }
      renderNews(cache);
    });
    el.appendChild(b);
  });
}

export function renderNews(items) {
  cache = items;
  renderFilters();
  const el = document.getElementById('newsList');
  el.innerHTML = '';
  const list = pick(items);
  if (!list.length) {
    el.innerHTML = '<div class="loading">nothing here right now</div>';
    return;
  }
  // A dot on every row says nothing; only mark when it distinguishes.
  const mark = list.some((n) => n.t <= lastVisit);
  list.forEach((n) => {
    const a = document.createElement('a');
    a.className = 'row';
    a.href = n.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const wrap = document.createElement('span');
    wrap.style.cssText = 'flex:1;min-width:0';
    const q = document.createElement('span');
    q.className = 'q';
    if (mark && n.t > lastVisit) {
      const dot = document.createElement('span');
      dot.className = 'new';
      dot.title = 'new since your last visit';
      q.appendChild(dot);
    }
    q.appendChild(document.createTextNode(n.title));
    const sub = document.createElement('span');
    sub.className = 'sub';
    const tag = document.createElement('span');
    tag.className = 'src';
    tag.textContent = n.src;
    sub.appendChild(tag);
    sub.appendChild(document.createTextNode([relTime(n.t), n.detail].filter(Boolean).join(' · ')));
    wrap.appendChild(q);
    wrap.appendChild(sub);
    a.appendChild(wrap);
    el.appendChild(a);
  });
}
