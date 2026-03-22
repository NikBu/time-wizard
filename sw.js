const CACHE_NAME = 'timewizard-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon/favicon-96x96.png',
  '/assets/favicon/favicon.svg',
  '/assets/favicon/favicon.ico',
  '/assets/favicon/apple-touch-icon.png',
  '/assets/favicon/site.webmanifest'
];

const RUNTIME_CACHE = 'timewizard-runtime-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME && key !== RUNTIME_CACHE) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return cached;
      }
    })
  );
});
