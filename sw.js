// Service Worker קליל - caching של מעטפת האפליקציה לעבודה אופליין

const CACHE_NAME = 'xmoney-shell-v4';
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/storage.js',
  './js/categories.js',
  './js/parser.js',
  './js/stats.js',
  './js/voice.js',
  './js/sync.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/logo-wordmark.svg'
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

// network-first: תמיד מנסה גרסה עדכנית מהרשת, ונופל לגרסה שמורה רק כשאין רשת
// (לא cache-first, כדי שעדכונים לאפליקציה יופיעו מיד ולא יתקעו על גרסה ישנה)
self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(function (response) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(event.request, copy);
      });
      return response;
    }).catch(function () {
      return caches.match(event.request);
    })
  );
});
