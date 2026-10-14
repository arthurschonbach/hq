// Markets: Yahoo Finance fetch + text-row rendering.
import { ETF_CONFIG } from './config.js';
import { proxyJson } from './proxy.js';

export async function loadMarkets() {
  try {
    return await Promise.all(
      ETF_CONFIG.map(async (etf) => {
        const raw =
          'https://query1.finance.yahoo.com/v8/finance/chart/' +
          etf.ticker +
          '?range=ytd&interval=1d&includePrePost=false';
        const json = await proxyJson(raw);
        const r = json.chart.result[0];
        const meta = r.meta;
        const closes = (r.indicators.quote[0].close || []).filter((c) => c !== null);
        const price = meta.regularMarketPrice;
        const prev =
          closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose || price;
        const chg = prev ? ((price - prev) / prev) * 100 : 0;
        const ytd0 = meta.chartPreviousClose;
        const ytd = ytd0 ? ((price - ytd0) / ytd0) * 100 : null;
        // Trailing-window series for the context chart: last ~22 trading days,
        // rebased to the window start (steady year-round, moves visit to visit).
        const step = Math.max(1, Math.floor(closes.length / 60));
        const sampled = closes.filter((_, i) => i % step === 0);
        if (closes.length && (closes.length - 1) % step !== 0) sampled.push(closes[closes.length - 1]);
        const window = sampled.slice(-22); // ~last 30 calendar days
        const base = window[0];
        const series = base && window.length > 2 ? window.map((c) => ((c - base) / base) * 100) : null;
        return { price, chg, ytd, series };
      }),
    );
  } catch (e) {
    console.warn('etf fetch failed:', e.message);
    return null;
  }
}

export function fmtPct(v, digits) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(digits === undefined ? 2 : digits) + '%';
}

export function renderMarkets(data) {
  const el = document.getElementById('etfList');
  el.innerHTML = '';
  ETF_CONFIG.forEach((etf, i) => {
    const d = data[i];
    const row = document.createElement('div');
    row.className = 'row';
    const name = document.createElement('span');
    name.className = 'name';
    const dot = document.createElement('span');
    dot.className = 'cdot';
    dot.style.background = etf.color;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = etf.name;
    const tick = document.createElement('span');
    tick.className = 'ticker';
    tick.textContent = etf.short;
    name.appendChild(dot);
    name.appendChild(lbl);
    name.appendChild(tick);
    const nums = document.createElement('span');
    nums.className = 'nums';
    nums.textContent = '€' + d.price.toFixed(2) + ' ';
    const chg = document.createElement('span');
    chg.className = d.chg >= 0 ? 'up' : 'down';
    chg.textContent = (d.chg >= 0 ? '↑' : '↓') + Math.abs(d.chg).toFixed(2) + '%';
    const ytd = document.createElement('span');
    ytd.className = 'muted';
    ytd.textContent = fmtPct(d.ytd, 1) + ' ytd';
    nums.appendChild(chg);
    nums.appendChild(document.createTextNode(' '));
    nums.appendChild(ytd);
    row.appendChild(name);
    row.appendChild(nums);
    el.appendChild(row);
  });
}
