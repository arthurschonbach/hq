// Reading: world headlines (BBC RSS via proxy) + a little tech (HN, direct).
import { proxyText } from './proxy.js';

const BBC_RSS = 'https://feeds.bbci.co.uk/news/world/rss.xml';
const HN_API = 'https://hn.algolia.com/api/v1/search?tags=front_page';

function relTime(pubDate) {
  const t = new Date(pubDate).getTime();
  if (Number.isNaN(t)) return '';
  const h = Math.round((Date.now() - t) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}

async function loadWorld() {
  const xml = await proxyText(BBC_RSS, 12000);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const nodes = [...doc.querySelectorAll('item')].slice(0, 6);
  const items = nodes
    .map((it) => {
      const title = (it.querySelector('title') || {}).textContent || '';
      const url = ((it.querySelector('link') || {}).textContent || '').trim();
      const pub = (it.querySelector('pubDate') || {}).textContent || '';
      return title && url ? { title: title.trim(), url, src: 'BBC', detail: relTime(pub) } : null;
    })
    .filter(Boolean);
  if (items.length < 2) throw new Error('bbc parse yielded nothing');
  return items.slice(0, 5);
}

async function loadTech() {
  const res = await fetch(HN_API, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('hn ' + res.status);
  const j = await res.json();
  return (j.hits || []).slice(0, 3).map((h) => ({
    title: h.title,
    src: 'HN',
    detail: (h.points || 0) + ' pts · ' + (h.num_comments || 0) + ' comments',
    url: h.url || 'https://news.ycombinator.com/item?id=' + h.objectID,
  }));
}

export async function loadNews() {
  const [world, tech] = await Promise.allSettled([loadWorld(), loadTech()]);
  const out = [];
  if (world.status === 'fulfilled') out.push(...world.value);
  if (tech.status === 'fulfilled') out.push(...tech.value);
  if (!out.length) {
    const reason =
      world.status === 'rejected' ? world.reason && world.reason.message : 'empty';
    throw new Error('news unavailable: ' + reason);
  }
  return out;
}

export function renderNews(items) {
  const el = document.getElementById('newsList');
  el.innerHTML = '';
  items.forEach((n) => {
    const a = document.createElement('a');
    a.className = 'row';
    a.href = n.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const wrap = document.createElement('span');
    wrap.style.cssText = 'flex:1;min-width:0';
    const q = document.createElement('span');
    q.className = 'q';
    q.style.webkitLineClamp = '1';
    q.textContent = n.title;
    const sub = document.createElement('span');
    sub.className = 'sub';
    const tag = document.createElement('span');
    tag.className = 'src';
    tag.textContent = n.src || '';
    sub.appendChild(tag);
    if (n.detail) sub.appendChild(document.createTextNode(n.detail));
    wrap.appendChild(q);
    wrap.appendChild(sub);
    a.appendChild(wrap);
    el.appendChild(a);
  });
}
