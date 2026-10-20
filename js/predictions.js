// Predictions: one merged Polymarket list, ranked by 3-day move. No tabs.
import { THEMES, THEME_TAG_MAP } from './config.js';
import { proxyJson } from './proxy.js';

const SPORTS = new Set([
  'sports', 'nba', 'nfl', 'mlb', 'nhl', 'soccer', 'football',
  'tennis', 'golf', 'mma', 'ufc', 'cricket', 'f1', 'formula-1',
  'olympics', 'esports',
]);

// Minimal 14px stroke glyphs — one per theme, muted, for fast scanning.
const ICONS = {
  'politics': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 5 7 2.5 12 5"/><path d="M3 5v5M5.5 5v5M8 5v5M10.5 5v5"/><path d="M1.8 11.5h10.4"/></svg>',
  'ai-tech': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="4" y="4" width="6" height="6" rx="1"/><path d="M5.5 1.5v2M8.5 1.5v2M5.5 10.5v2M8.5 10.5v2M1.5 5.5h2M1.5 8.5h2M10.5 5.5h2M10.5 8.5h2"/></svg>',
  'economy': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="M7 4.6v4.8M5.3 6h2.5a1.3 1.3 0 0 1 0 2.6H5.3"/></svg>',
  'geopolitics': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><circle cx="7" cy="7" r="4.6"/><path d="M2.4 7h9.2M7 2.4c-3.2 3-3.2 6.2 0 9.2M7 2.4c3.2 3 3.2 6.2 0 9.2"/></svg>',
  'climate': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7.6 1.6 3.2 8h2.9l-.9 4.4 4.6-6.4H6.9z"/></svg>',
  'science': '<svg class="tsvg" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 1.6h3M6.2 1.6v3.9l-3.4 5.7a1 1 0 0 0 .9 1.4h6.6a1 1 0 0 0 .9-1.4L8 5.5V1.6"/></svg>',
};

function iconFor(id) {
  return ICONS[id] || '';
}

function isSports(e) {
  const tags = (e.tags || []).map((t) => (t.slug || '').toLowerCase());
  if (tags.some((t) => SPORTS.has(t))) return true;
  if ((e.markets || []).some((m) => m.sportsMarketType)) return true;
  return false;
}

function formatVolume(v) {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'm';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'k';
  return '$' + Math.round(v);
}

async function fetchClobDelta(tokenId) {
  try {
    const url =
      'https://clob.polymarket.com/prices-history?market=' + tokenId + '&interval=1w&fidelity=1440';
    const data = await proxyJson(url, 8000);
    const h = data && data.history;
    if (!h || h.length < 2) return null;
    const last = parseFloat(h[h.length - 1].p);
    const ago = Date.now() / 1000 - 3 * 86400;
    const ref = h.reduce((b, p) => (Math.abs(p.t - ago) < Math.abs(b.t - ago) ? p : b));
    return Math.round((last - parseFloat(ref.p)) * 100);
  } catch {
    return null;
  }
}

async function fetchTheme(tag) {
  const slugs = THEME_TAG_MAP[tag] || [tag];
  let events = [];
  const batches = await Promise.all(
    slugs.map(async (s) => {
      try {
        const raw =
          'https://gamma-api.polymarket.com/events?closed=false&limit=8&order=volume&ascending=false&tag_slug=' + s;
        return await proxyJson(raw);
      } catch {
        return [];
      }
    }),
  );
  batches.forEach((a) => events.push(...a));
  const seen = new Set();
  events = events.filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
  events = events.filter((e) => !isSports(e) && (e.volume || 0) >= 5000);
  events = events.filter((e) =>
    (e.markets || []).some((m) => m.active && !m.closed && m.outcomePrices),
  );
  events.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
  events = events.slice(0, 6);

  const items = events
    .map((e) => {
      const act = (e.markets || []).filter((m) => m.active && !m.closed && m.outcomePrices);
      if (!act.length) return null;
      const multi = e.negRisk || act.length > 3;
      let top = act[0];
      if (multi) {
        top = act.reduce((best, m) => {
          try {
            return parseFloat(JSON.parse(m.outcomePrices)[0]) >
              parseFloat(JSON.parse(best.outcomePrices)[0])
              ? m
              : best;
          } catch {
            return best;
          }
        }, act[0]);
      } else {
        act.sort((a, b) => (parseFloat(b.volume) || 0) - (parseFloat(a.volume) || 0));
        top = act[0];
      }
      let q;
      if (multi) {
        const o = (top.groupItemTitle || top.question || '').trim();
        q = joinTitle(e.title, o);
      } else {
        q = top.question || e.title;
      }
      let yes = 50;
      try {
        yes = Math.round(parseFloat(JSON.parse(top.outcomePrices)[0]) * 100);
      } catch {
        /* keep 50 */
      }
      let token = null;
      try {
        token = JSON.parse(top.clobTokenIds)[0];
      } catch {
        /* no history */
      }
      const vol = e.volume || parseFloat(top.volume) || 0;
      const end =
        e.endDate || top.endDate
          ? new Date(e.endDate || top.endDate).toLocaleDateString('en', {
              month: 'short',
              year: 'numeric',
            })
          : '—';
      return {
        id: e.id,
        q,
        yes,
        d3: null,
        vol: formatVolume(vol),
        vol24: e.volume24hr || 0,
        end,
        token,
        theme: tag,
        url: 'https://polymarket.com/event/' + e.slug,
      };
    })
    .filter(Boolean);

  await Promise.all(
    items.map(async (it) => {
      if (it.token) it.d3 = await fetchClobDelta(it.token);
    }),
  );
  return items;
}

export async function loadPredictions() {
  const all = (
    await Promise.all(THEMES.map((t) => fetchTheme(t.id).catch(() => [])))
  ).flat();
  // An event can match several themes; keep its first one.
  const seen = new Set();
  return all.filter((it) => !seen.has(it.id) && (seen.add(it.id), true));
}

// "US-Iran ceasefire continues through...?" + "October 22"
//   → "US-Iran ceasefire continues through October 22?"
function joinTitle(title, outcome) {
  if (!outcome || outcome === title) return title;
  if (/(\.\.\.|…)/.test(title)) return title.replace(/\s*(\.\.\.|…)\s*/, ' ' + outcome + ' ').replace(/\s+\?/, '?').trim();
  return title + ' — ' + outcome;
}

// Big moves on thin markets are noise: weight the 3-day move by recent activity.
function score(it) {
  return Math.abs(it.d3 || 0) * Math.log10(10 + (it.vol24 || 0));
}

function themeLabel(id) {
  const t = THEMES.find((x) => x.id === id);
  return t ? t.label : id;
}

export function renderPredictions(items) {
  const el = document.getElementById('predList');
  el.innerHTML = '';
  const sorted = [...items]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 6);
  sorted.forEach((it) => {
    const a = document.createElement('a');
    a.className = 'row';
    if (it.url) {
      a.href = it.url;
      a.target = '_blank';
      a.rel = 'noopener';
    }
    const wrap = document.createElement('span');
    wrap.style.cssText = 'flex:1;min-width:0';
    const line = document.createElement('span');
    line.className = 'qline';
    const q = document.createElement('span');
    q.className = 'q';
    q.textContent = it.q;
    const nums = document.createElement('span');
    nums.className = 'nums';
    nums.textContent = it.yes + '%';
    if (it.d3 !== null && it.d3 !== undefined) {
      const d = document.createElement('span');
      d.className = it.d3 > 0 ? 'up' : it.d3 < 0 ? 'down' : '';
      d.textContent =
        ' ' + (it.d3 > 0 ? '↑' + it.d3 : it.d3 < 0 ? '↓' + Math.abs(it.d3) : '·');
      nums.appendChild(d);
    }
    const sub = document.createElement('span');
    sub.className = 'sub';
    const svg = iconFor(it.theme);
    if (svg) {
      const ic = document.createElement('span');
      ic.innerHTML = svg;
      sub.appendChild(ic);
    }
    sub.appendChild(
      document.createTextNode(themeLabel(it.theme) + ' · ' + it.vol + ' · ' + it.end),
    );
    const bar = document.createElement('span');
    bar.className = 'pbar';
    const fill = document.createElement('span');
    fill.style.width = Math.max(0, Math.min(100, it.yes)) + '%';
    bar.appendChild(fill);
    line.appendChild(q);
    line.appendChild(nums);
    wrap.appendChild(line);
    wrap.appendChild(sub);
    wrap.appendChild(bar);
    a.appendChild(wrap);
    el.appendChild(a);
  });
}
