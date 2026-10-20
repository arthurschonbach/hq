// Predictions: one merged Polymarket list, ranked by 3-day move, each with a
// 14-day sparkline whose last 3 days carry the move's colour.
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

const HISTORY_DAYS = 14;
const MOVE_DAYS = 3;
const SHOW = 6;

/**
 * 14 days of the outcome's price (3h steps) →
 * { s: [0–100…], k: index where the 3-day window starts, a: where the data starts
 *   within the 14 days (0 = full span; >0 = younger market), d3 }.
 */
async function fetchHistory(tokenId) {
  try {
    const start = Math.floor(Date.now() / 1000) - HISTORY_DAYS * 86400;
    const url =
      'https://clob.polymarket.com/prices-history?market=' + tokenId + '&startTs=' + start + '&fidelity=180';
    const data = await proxyJson(url, 8000);
    const h = data && data.history;
    if (!h || h.length < 2) return null;
    const ago = Date.now() / 1000 - MOVE_DAYS * 86400;
    let k = h.findIndex((p) => p.t >= ago);
    if (k < 0) k = h.length - 1;
    const s = h.map((p) => Math.round(parseFloat(p.p) * 1000) / 10);
    const span = HISTORY_DAYS * 86400;
    const a = Math.max(0, Math.min(0.95, (h[0].t - (Date.now() / 1000 - span)) / span));
    return { s, k, a: Math.round(a * 100) / 100, d3: Math.round(s[s.length - 1] - s[k]) };
  } catch {
    return null;
  }
}

const price = (m) => {
  try {
    return parseFloat(JSON.parse(m.outcomePrices)[0]);
  } catch {
    return NaN;
  }
};

// "US-Iran ceasefire continues through...?" + "October 22"
//   → "US-Iran ceasefire continues through October 22?"
function fillTitle(title, outcome) {
  return title.replace(/\s*(\.\.\.|…)\s*/, ' ' + outcome + ' ').replace(/\s+\?/, '?').trim();
}

/**
 * Which outcome to show for an event:
 *  - candidates ("Who will be PM?", negRisk): the leader, plus the runner-up for context;
 *  - ladders ("…by March 31 / June 30 / …"): the rung closest to 50%: the near-certain
 *    first rung says nothing, the open question is where it tips;
 *  - single market: itself.
 */
function pickOutcome(e, act) {
  const named = (m) => (m.groupItemTitle || m.question || '').trim();
  if (act.length === 1) return { m: act[0], q: act[0].question || e.title };
  const byPrice = [...act].sort((a, b) => price(b) - price(a));
  if (e.negRisk) {
    const [lead, second] = byPrice;
    return {
      m: lead,
      q: e.title,
      outcome: named(lead),
      runner: second ? { name: named(second), yes: Math.round(price(second) * 100) } : null,
    };
  }
  const m = byPrice.reduce((b, x) => (Math.abs(price(x) - 0.5) < Math.abs(price(b) - 0.5) ? x : b));
  return /(\.\.\.|…)/.test(e.title)
    ? { m, q: fillTitle(e.title, named(m)) }
    : { m, q: e.title, outcome: named(m) };
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
      const act = (e.markets || []).filter(
        (m) => m.active && !m.closed && m.outcomePrices && !Number.isNaN(price(m)),
      );
      if (!act.length) return null;
      const { m, q, outcome, runner } = pickOutcome(e, act);
      let token = null;
      try {
        token = JSON.parse(m.clobTokenIds)[0];
      } catch {
        /* no history */
      }
      const endDate = e.endDate || m.endDate;
      return {
        id: e.id,
        q,
        outcome: outcome && outcome !== q ? outcome : null,
        runner,
        yes: Math.round(price(m) * 100),
        d3: null,
        hist: null,
        vol: formatVolume(e.volume || parseFloat(m.volume) || 0),
        vol24: e.volume24hr || 0,
        end: endDate ? new Date(endDate).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : null,
        token,
        theme: tag,
        url: 'https://polymarket.com/event/' + e.slug,
      };
    })
    .filter(Boolean);

  await Promise.all(
    items.map(async (it) => {
      const h = it.token ? await fetchHistory(it.token) : null;
      if (h) {
        it.d3 = h.d3;
        it.hist = { s: h.s, k: h.k, a: h.a };
      }
      delete it.token;
    }),
  );
  return items;
}

// Big moves on thin markets are noise: weight the 3-day move by recent activity.
function score(it) {
  return Math.abs(it.d3 || 0) * Math.log10(10 + (it.vol24 || 0));
}

export async function loadPredictions() {
  const all = (
    await Promise.all(THEMES.map((t) => fetchTheme(t.id).catch(() => [])))
  ).flat();
  // An event can match several themes; keep its first one.
  const seen = new Set();
  return all
    .filter((it) => !seen.has(it.id) && (seen.add(it.id), true))
    .sort((a, b) => score(b) - score(a))
    .slice(0, SHOW);
}

function themeLabel(id) {
  const t = THEMES.find((x) => x.id === id);
  return t ? t.label : id;
}

const SVGNS = 'http://www.w3.org/2000/svg';

/**
 * Sparkline: the 14 days in a quiet line, the last 3 in the move's colour, a dot on "now".
 * Placed on a 14-day time axis, so a younger market only fills the right part.
 * Autoscaled, but never tighter than a 10-point band so noise doesn't look like news.
 */
function sparkline(hist, dir) {
  const W = 72;
  const H = 24;
  const P = 2.5;
  const { s, k } = hist;
  const a = hist.a || 0;
  let lo = Math.min(...s);
  let hi = Math.max(...s);
  if (hi - lo < 10) {
    const mid = (hi + lo) / 2;
    lo = Math.max(0, mid - 5);
    hi = Math.min(100, lo + 10);
    lo = hi - 10;
  }
  const x = (i) => P + (a + (i / (s.length - 1)) * (1 - a)) * (W - 2 * P);
  const y = (v) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  const pts = (a, b) =>
    s
      .slice(a, b)
      .map((v, i) => x(a + i).toFixed(1) + ',' + y(v).toFixed(1))
      .join(' ');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.setAttribute('class', 'spark');
  svg.setAttribute('aria-hidden', 'true');
  const line = (points, cls) => {
    const p = document.createElementNS(SVGNS, 'polyline');
    p.setAttribute('points', points);
    p.setAttribute('class', cls);
    svg.appendChild(p);
  };
  line(pts(0, k + 1), 'past');
  line(pts(k, s.length), 'recent ' + dir);
  const dot = document.createElementNS(SVGNS, 'circle');
  dot.setAttribute('cx', x(s.length - 1).toFixed(1));
  dot.setAttribute('cy', y(s[s.length - 1]).toFixed(1));
  dot.setAttribute('r', '2');
  dot.setAttribute('class', 'now ' + dir);
  svg.appendChild(dot);
  return svg;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function renderPredictions(items) {
  const root = document.getElementById('predList');
  root.innerHTML = '';
  [...items]
    .sort((a, b) => score(b) - score(a))
    .slice(0, SHOW)
    .forEach((it) => {
      const dir = it.d3 > 0 ? 'up' : it.d3 < 0 ? 'down' : 'flat';
      const a = el('a', 'row pred');
      if (it.url) {
        a.href = it.url;
        a.target = '_blank';
        a.rel = 'noopener';
      }

      const text = el('span', 'ptext');
      text.appendChild(el('span', 'q', it.q));
      const sub = el('span', 'sub');
      const svg = iconFor(it.theme);
      if (svg) {
        const ic = el('span');
        ic.innerHTML = svg;
        sub.appendChild(ic);
      }
      // The outcome the number refers to leads the line; runner-up gives the race.
      if (it.outcome) {
        sub.appendChild(el('span', 'outcome', it.outcome));
        if (it.runner) sub.appendChild(document.createTextNode(' vs ' + it.runner.name + ' ' + it.runner.yes + '%'));
        sub.appendChild(document.createTextNode(' · '));
      } else {
        sub.appendChild(document.createTextNode(themeLabel(it.theme) + ' · '));
      }
      // End date before volume: if the line runs out of room, volume is what gets cut.
      sub.appendChild(document.createTextNode([it.end, it.vol].filter(Boolean).join(' · ')));
      text.appendChild(sub);

      const fig = el('span', 'pfig');
      if (it.hist && it.hist.s && it.hist.s.length > 2) fig.appendChild(sparkline(it.hist, dir));
      const nums = el('span', 'pnums');
      nums.appendChild(el('span', 'pyes', it.yes + '%'));
      if (it.d3 !== null && it.d3 !== undefined) {
        const sign = it.d3 > 0 ? '+' : it.d3 < 0 ? '−' : '±';
        nums.appendChild(el('span', 'pd3 ' + dir, sign + Math.abs(it.d3) + ' pts'));
      }
      fig.appendChild(nums);

      const days = it.hist && it.hist.a ? Math.max(1, Math.round(HISTORY_DAYS * (1 - it.hist.a))) : HISTORY_DAYS;
      a.title =
        it.q + (it.outcome ? ' — ' + it.outcome : '') + ': ' + it.yes + '% chance' +
        (it.d3 !== null && it.d3 !== undefined ? ', ' + (it.d3 > 0 ? '+' : '') + it.d3 + ' pts over 3 days' : '') +
        ' · line: last ' + days + ' days' + (days < HISTORY_DAYS ? ' (market is new)' : '');
      a.appendChild(text);
      a.appendChild(fig);
      root.appendChild(a);
    });
}
