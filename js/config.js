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
// Two rows on desktop: equities & FX, then rates. Yahoo has no euro govvies,
// so French/German yields come from CNBC (src: 'cnbc').
// invert: rising is risk-off (yields, spreads), so it shows red.
export const REGIME_CONFIG = [
  { label: 'CAC 40', ticker: '^FCHI', digits: 1, format: (v) => Math.round(v).toLocaleString('fr-FR') },
  { label: 'EUR/USD', ticker: 'EURUSD=X', digits: 1, format: (v) => v.toFixed(3) },
  { label: 'BTC', ticker: 'BTC-USD', digits: 1, format: (v) => '$' + Math.round(v).toLocaleString('en-US') },
  { label: 'OAT 10Y', src: 'cnbc', symbol: 'FR10Y-FR', change: 'bps', invert: true, format: (v) => v.toFixed(2) + '%' },
  // France − Germany 10Y, in basis points: the market's read on French fiscal risk.
  { label: 'OAT–Bund', src: 'cnbc', spread: ['FR10Y-FR', 'DE10Y-DE'], change: 'bp', invert: true, format: (v) => Math.round(v) + 'bp' },
  { label: 'US 10Y', ticker: '^TNX', change: 'bps', invert: true, format: (v) => v.toFixed(2) + '%' },
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
