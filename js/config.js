// Shared constants for hq.

export const REFRESH_INTERVAL = 5 * 60 * 1000;

export const PROXY_URL = 'https://shy-block-4ddc.arthur-schonbach.workers.dev/?url=';
export const FALLBACK_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy/?quest=',
];

export const ETF_CONFIG = [
  { name: 'MSCI World', ticker: 'IWDA.AS', short: 'IWDA', color: '#6b8afd' },
  { name: 'Nasdaq 100', ticker: 'CNDX.AS', short: 'CNDX', color: '#c08a45' },
  { name: 'Stoxx 600', ticker: 'EXSA.DE', short: 'EXSA', color: '#9a7bd4' },
  { name: 'Emerging Markets', ticker: 'EMIM.AS', short: 'EMIM', color: '#43a080' },
];

export const MOCK_ETF = [
  { price: 89.54, chg: 0.43, ytd: 5.8, series: null },
  { price: 42.18, chg: 0.81, ytd: 9.2, series: null },
  { price: 27.14, chg: -0.18, ytd: 3.1, series: null },
  { price: 33.61, chg: 0.33, ytd: 2.4, series: null },
];

export const THEMES = [
  { id: 'politics', label: 'politics' },
  { id: 'ai-tech', label: 'ai & tech' },
  { id: 'economy', label: 'economy' },
  { id: 'geopolitics', label: 'geopolitics' },
  { id: 'climate', label: 'climate' },
  { id: 'science', label: 'science' },
];

export const THEME_TAG_MAP = {
  'politics': ['politics', 'elections', 'congress', 'trump'],
  'ai-tech': ['ai', 'openai', 'google', 'nvidia'],
  'economy': ['economy', 'crypto', 'bitcoin', 'fed-rates', 'inflation', 'tariffs'],
  'geopolitics': ['geopolitics', 'ukraine', 'china', 'nato', 'middle-east', 'russia', 'iran'],
  'climate': ['climate', 'oil', 'weather', 'nuclear', 'energy'],
  'science': ['science', 'space', 'spacex', 'health'],
};

export const MOCK_PRED = [
  { q: 'GPT-5 released before July 2026?', yes: 72, d3: 6, vol: '$8.1m', end: 'Jul 2026', theme: 'ai-tech' },
  { q: 'Bitcoin exceeds $150K in 2026?', yes: 37, d3: 8, vol: '$12.4m', end: 'Dec 2026', theme: 'economy' },
  { q: 'Ukraine ceasefire signed in 2026?', yes: 34, d3: 4, vol: '$7.8m', end: 'Dec 2026', theme: 'geopolitics' },
  { q: '2026 hottest year on record?', yes: 68, d3: 2, vol: '$3.1m', end: 'Dec 2026', theme: 'climate' },
  { q: 'SpaceX Starship achieves orbital refueling?', yes: 61, d3: 5, vol: '$3.6m', end: 'Dec 2026', theme: 'science' },
  { q: 'Republicans win 2026 Senate majority?', yes: 62, d3: 3, vol: '$4.2m', end: 'Nov 2026', theme: 'politics' },
];

// Regime strip: cross-asset context the equity ETFs can't show.
export const REGIME_CONFIG = [
  { label: 'VIX', ticker: '^VIX', invert: true, digits: 1, format: (v) => v.toFixed(1) },
  { label: '10Y', ticker: '^TNX', change: 'bps', format: (v) => v.toFixed(2) + '%' },
  { label: 'EUR/USD', ticker: 'EURUSD=X', digits: 1, format: (v) => v.toFixed(3) },
  { label: 'BTC', ticker: 'BTC-USD', digits: 1, format: (v) => '$' + Math.round(v).toLocaleString('en-US') },
];
