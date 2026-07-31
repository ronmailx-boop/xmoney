// Service Worker קליל - caching של מעטפת האפליקציה לעבודה אופליין

const CACHE_NAME = 'xmoney-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/categories.js',
  './js/parser.js',
  './js/stats.js',
  './js/voice.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request).catch(function () {
        return cached;
      });
    })
  );
});
