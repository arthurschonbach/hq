// hq service worker: offline app shell, always-fresh data.
// Same-origin (shell) → cache-first, refreshed in background.
// Cross-origin (Yahoo/Polymarket/BBC/HN) → network only, never cached.
const VERSION = 'hq-v3';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/app.js',
  './js/config.js',
  './js/proxy.js',
  './js/theme.js',
  './js/markets.js',
  './js/chart.js',
  './js/regime.js',
  './js/predictions.js',
  './js/news.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // data: network only
  // Stale-while-revalidate: answer from cache, refresh it for the next open.
  const fresh = fetch(e.request).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
    }
    return res;
  });
  e.respondWith(caches.match(e.request).then((hit) => hit || fresh));
  e.waitUntil(fresh.catch(() => {}));
});
