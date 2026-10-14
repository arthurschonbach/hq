// Regime strip: VIX, 10Y, EUR/USD, BTC — cross-asset context
// the equity ETFs can't show. Renders one wrapping hairline row;
// stays hidden if nothing loads (context, not core content).
import { REGIME_CONFIG } from './config.js';
import { proxyJson } from './proxy.js';

async function loadOne(cfg) {
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

export async function loadRegime() {
  const out = await Promise.all(REGIME_CONFIG.map((cfg) => loadOne(cfg).catch(() => null)));
  return out.filter((d) => d && d.price !== null && d.price !== undefined);
}

function changeFor(cfg, price, prev) {
  if (prev === null || prev === undefined || !prev) return null;
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
      // VIX up = stress: invert so red always means "risk off".
      if (cfg.invert && ch.dir !== 0) cls = ch.dir > 0 ? 'down' : 'up';
      c.className = ('rchg ' + cls).trim();
      c.textContent = ch.text;
      s.appendChild(c);
    }
    el.appendChild(s);
  });
  el.hidden = false;
}
