// Offline-first service worker so "あそびばこ" keeps working with no signal
// (the whole point: this app is meant to be used out and about).
// Paths are relative to this file's own location, so it works whether the
// site is hosted at a domain root or a GitHub Pages project subpath.
const CACHE_VERSION = 'v5';
const CACHE_NAME = `asobibako-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.json',
  'shared/app.js',
  'shared/style.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/characters/kuma.png',
  'icons/characters/neko.png',
  'icons/characters/usagi.png',
  'games/bubble-pop/index.html',
  'games/bubble-pop/script.js',
  'games/finger-paint/index.html',
  'games/finger-paint/script.js',
  'games/animal-sounds/index.html',
  'games/animal-sounds/script.js',
  'games/fireworks/index.html',
  'games/fireworks/script.js',
  'games/star-catch/index.html',
  'games/star-catch/script.js',
  'games/shape-sorter/index.html',
  'games/shape-sorter/script.js',
  'games/color-hunt/index.html',
  'games/color-hunt/script.js',
  'games/rain-ripples/index.html',
  'games/rain-ripples/script.js',
  'games/animal-quiz/index.html',
  'games/animal-quiz/script.js',
  'games/memory-match/index.html',
  'games/memory-match/script.js',
  'games/counting/index.html',
  'games/counting/script.js',
  'games/pet-friends/index.html',
  'games/pet-friends/script.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urls = PRECACHE_URLS.map((u) => new URL(u, self.registration.scope).toString());
      return cache.addAll(urls);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === 'navigate') {
            return caches.match(new URL('index.html', self.registration.scope).toString());
          }
          return caches.match(req);
        });
    })
  );
});
