// Service Worker for Memorable Moments Photography
const CACHE_NAME = 'memorable-moments-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './styles.min.css',
    './critical.css',
    './hero.css',
    './hero.js',
    './logo.svg',
    './images/hero-bg.jpg.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
