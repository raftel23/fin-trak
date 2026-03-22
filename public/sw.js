/**
 * sw.js
 * Hand-written Service Worker for FinTrak.
 * Optimized for production: Network-First for main shell, Cache-First for static assets.
 */

const CACHE_NAME = 'acorn-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/acorn_logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Acorn] Cache version:', CACHE_NAME);
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-First strategy for the main entry point to ensure users get the latest build
  if (event.request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-First strategy for others (images, fonts, bundles)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      });
    })
  );
});
