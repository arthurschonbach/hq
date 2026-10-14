// hq entry point: theme, clock, and the four sections.
import { REFRESH_INTERVAL, MOCK_ETF, MOCK_PRED, ETF_CONFIG } from './config.js';
import { initTheme } from './theme.js';
import { loadMarkets, renderMarkets } from './markets.js';
import { renderChart } from './chart.js';
import { loadRegime, renderRegime } from './regime.js';
import { loadPredictions, renderPredictions } from './predictions.js';
import { loadNews, renderNews } from './news.js';

function updateMeta() {
  const now = new Date();
  const date = now
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toLowerCase();
  let status = 'closed';
  try {
    const cet = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const day = cet.getDay();
    const mins = cet.getHours() * 60 + cet.getMinutes();
    if (day >= 1 && day <= 5 && mins >= 540 && mins < 1050) status = 'open';
  } catch {
    /* ignore */
  }
  const hm = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dot = document.getElementById('statusDot');
  if (dot) dot.className = 'sdot ' + status;
  document.getElementById('headerMeta').textContent = date + ' · market ' + status;
  document.getElementById('footMeta').textContent = 'updated ' + hm + ' · 5m refresh';
}

async function loadAll() {
  updateMeta();
  const [etf, pred, news, regime] = await Promise.allSettled([
    loadMarkets(),
    loadPredictions(),
    loadNews(),
    loadRegime(),
  ]);

  const etfData = etf.status === 'fulfilled' && etf.value ? etf.value : MOCK_ETF;
  renderMarkets(etfData);
  renderChart(etf.status === 'fulfilled' && etf.value ? etf.value : [], ETF_CONFIG);

  if (regime.status === 'fulfilled' && regime.value && regime.value.length) {
    renderRegime(regime.value);
  }

  renderPredictions(
    pred.status === 'fulfilled' && pred.value && pred.value.length >= 2
      ? pred.value
      : MOCK_PRED,
  );

  if (news.status === 'fulfilled' && news.value && news.value.length) {
    renderNews(news.value);
  } else {
    document.getElementById('newsList').innerHTML = '<div class="loading">unavailable</div>';
  }
}

initTheme();
loadAll();
setInterval(loadAll, REFRESH_INTERVAL);
