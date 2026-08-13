// Offline-first service worker so "あそびばこ" keeps working with no signal
// (the whole point: this app is meant to be used out and about).
// Paths are relative to this file's own location, so it works whether the
// site is hosted at a domain root or a GitHub Pages project subpath.
const CACHE_VERSION = 'v32';
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
  'icons/animals/dog.png',
  'icons/animals/cat.png',
  'icons/animals/cow.png',
  'icons/animals/frog.png',
  'icons/animals/pig.png',
  'icons/animals/chicken.png',
  'icons/animals/lion.png',
  'icons/animals/elephant.png',
  'icons/animals/sheep.png',
  'shared/sounds/dog.mp3',
  'shared/sounds/cat.mp3',
  'shared/sounds/cow.mp3',
  'shared/sounds/frog.mp3',
  'shared/sounds/pig.mp3',
  'shared/sounds/chicken.mp3',
  'shared/sounds/lion.mp3',
  'shared/sounds/elephant.mp3',
  'shared/sounds/sheep.mp3',
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
  'games/elevator/index.html',
  'games/elevator/script.js',
  'games/gacha/index.html',
  'games/gacha/script.js',
  'games/night-safari/index.html',
  'games/night-safari/script.js',
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

// Lets the page ask "what version are you actually running" - the launcher
// shows this so it's obvious at a glance whether an update has really
// taken effect, instead of just hoping the cache refreshed.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
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
