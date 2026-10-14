// hq service worker: offline app shell, always-fresh data.
// Same-origin (shell) → cache-first, refreshed in background.
// Cross-origin (Yahoo/Polymarket/BBC/HN) → network only, never cached.
const VERSION = 'hq-v1';
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
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        }),
    ),
  );
});
