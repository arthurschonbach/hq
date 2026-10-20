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

// Regime strip: cross-asset context the equity ETFs can't show.
export const REGIME_CONFIG = [
  { label: 'CAC 40', ticker: '^FCHI', digits: 1, format: (v) => Math.round(v).toLocaleString('fr-FR') },
  { label: 'VIX', ticker: '^VIX', invert: true, digits: 1, format: (v) => v.toFixed(1) },
  { label: 'US 10Y', ticker: '^TNX', change: 'bps', format: (v) => v.toFixed(2) + '%' },
  { label: 'EUR/USD', ticker: 'EURUSD=X', digits: 1, format: (v) => v.toFixed(3) },
  { label: 'BTC', ticker: 'BTC-USD', digits: 1, format: (v) => '$' + Math.round(v).toLocaleString('en-US') },
];

// Reading: RSS feeds merged into one time-sorted stream (HN is added in news.js).
export const NEWS_FEEDS = [
  // Économie first: on duplicates with "en continu", the first feed's category wins.
  { src: 'LE MONDE', cat: 'markets', url: 'https://www.lemonde.fr/economie/rss_full.xml' },
  { src: 'LE MONDE', cat: 'fr', url: 'https://www.lemonde.fr/rss/en_continu.xml' },
  { src: 'BBC', cat: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { src: 'CNBC', cat: 'markets', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
];

export const NEWS_FILTERS = [
  { id: 'tech', label: 'tech' }, // default
  { id: 'fr', label: 'france' },
  { id: 'world', label: 'world' },
  { id: 'markets', label: 'markets' },
];
