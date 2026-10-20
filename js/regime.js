// Regime strip: cross-asset context the equity ETFs can't show (equities & FX,
// then rates incl. French OAT and its spread to the Bund). An aligned grid;
// items that fail to load are skipped, and it stays hidden if nothing loads.
import { REGIME_CONFIG } from './config.js';
import { proxyJson } from './proxy.js';

async function loadYahoo(cfg) {
  const raw =
    'https://query1.finance.yahoo.com/v8/finance/chart/' +
    encodeURIComponent(cfg.ticker) +
    '?range=5d&interval=1d&includePrePost=false';
  const json = await proxyJson(raw);
  const r = json.chart.result[0];
  const meta = r.meta;
  const closes = (r.indicators.quote[0].close || []).filter((c) => c !== null);
  const price = meta.regularMarketPrice;
  const prev = closes.length >= 2 ? closes[closes.length - 2] : null;
  return { cfg, price, prev };
}

/** One CNBC call for every bond symbol the config needs → { symbol: { price, prev } }. */
async function loadCnbc() {
  const symbols = [
    ...new Set(REGIME_CONFIG.filter((c) => c.src === 'cnbc').flatMap((c) => c.spread || [c.symbol])),
  ];
  if (!symbols.length) return {};
  const raw =
    'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' +
    encodeURIComponent(symbols.join('|')) +
    '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json';
  const json = await proxyJson(raw);
  const quotes = json.FormattedQuoteResult.FormattedQuote;
  const out = {};
  (Array.isArray(quotes) ? quotes : [quotes]).forEach((q) => {
    const price = parseFloat(q.last);
    const prev = parseFloat(q.previous_day_closing);
    if (!Number.isNaN(price)) out[q.symbol] = { price, prev: Number.isNaN(prev) ? null : prev };
  });
  return out;
}

function fromCnbc(cfg, quotes) {
  if (cfg.spread) {
    const [a, b] = cfg.spread.map((s) => quotes[s]);
    if (!a || !b) return null;
    const prev = a.prev !== null && b.prev !== null ? (a.prev - b.prev) * 100 : null;
    return { cfg, price: (a.price - b.price) * 100, prev };
  }
  const q = quotes[cfg.symbol];
  return q ? { cfg, ...q } : null;
}

export async function loadRegime() {
  const cnbc = loadCnbc().catch(() => ({}));
  const out = await Promise.all(
    REGIME_CONFIG.map((cfg) =>
      cfg.src === 'cnbc' ? cnbc.then((q) => fromCnbc(cfg, q)) : loadYahoo(cfg).catch(() => null),
    ),
  );
  return out.filter((d) => d && d.price !== null && d.price !== undefined);
}

function changeFor(cfg, price, prev) {
  if (prev === null || prev === undefined || !prev) return null;
  // Spread already in bp: the change is the plain difference.
  if (cfg.change === 'bp') {
    const bp = Math.round(price - prev);
    if (!bp) return { text: '±0bp', dir: 0 };
    return { text: (bp > 0 ? '+' : '') + bp + 'bp', dir: Math.sign(bp) };
  }
  if (cfg.change === 'bps') {
    const bp = Math.round((price - prev) * 100);
    if (!bp) return { text: '±0bp', dir: 0 };
    return { text: (bp > 0 ? '+' : '') + bp + 'bp', dir: Math.sign(bp) };
  }
  const pct = ((price - prev) / prev) * 100;
  return {
    text: (pct >= 0 ? '↑' : '↓') + Math.abs(pct).toFixed(cfg.digits ?? 1) + '%',
    dir: pct === 0 ? 0 : Math.sign(pct),
  };
}

export function renderRegime(items) {
  const el = document.getElementById('regime');
  if (!el || !items.length) return;
  el.innerHTML = '';
  items.forEach(({ cfg, price, prev }) => {
    const s = document.createElement('span');
    s.className = 'ritem';
    if (cfg.src === 'cnbc') s.dataset.fr = ''; // French bonds: kept as a pair on phones
    const lab = document.createElement('span');
    lab.className = 'rlab';
    lab.textContent = cfg.label;
    const val = document.createElement('span');
    val.textContent = cfg.format(price);
    s.appendChild(lab);
    s.appendChild(val);
    const ch = changeFor(cfg, price, prev);
    if (ch) {
      const c = document.createElement('span');
      let cls = ch.dir > 0 ? 'up' : ch.dir < 0 ? 'down' : '';
      // Rising yields / spreads = stress: invert so red always means "risk off".
      if (cfg.invert && ch.dir !== 0) cls = ch.dir > 0 ? 'down' : 'up';
      c.className = ('rchg ' + cls).trim();
      c.textContent = ch.text;
      s.appendChild(c);
    }
    el.appendChild(s);
  });
  el.hidden = false;
}
