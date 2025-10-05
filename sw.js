// Service Worker for Memorable Moments Photography
const CACHE_NAME = 'memorable-moments-v2';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './styles.min.css',
  './critical.css',
  './hero.css',
  './hero.js',
  './script.js',
  './text-pressure.js',
  './data/gallery.json',
  './data/portfolio.json',
  './logo.svg',
  './images/hero-bg.jpg.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Strategy: network-first for navigation; stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    (async () => {
      if (req.mode === 'navigate') {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const fallback = await caches.match('./index.html');
          return fallback || Response.error();
        }
      }

      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then(async (res) => {
          try {
            if (res && res.ok) await cache.put(req, res.clone());
          } catch (e) {
            // ignore put errors
          }
          return res;
        })
        .catch(() => undefined);

      return cached || (await network) || fetch(req);
    })()
  );
});
