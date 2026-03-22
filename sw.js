// TimeWizard Service Worker — cache-first strategy
const CACHE_NAME = 'timewizard-v1';

// Files to cache on install (adjust paths if your repo structure differs)
const PRECACHE = [
  './index.html',
  './manifest.json',
  './assets/arch_idle.png',
  './assets/arch_excited.png',
  './assets/arch_sleepy.png',
  './assets/arch_concerned.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  // CDN resources — comment out if you want strict offline-only mode
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://api.fontshare.com/v2/css?f[]=boska@400,500,700&f[]=satoshi@400,500,700&display=swap',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual adds so one CDN failure doesn't block the whole install
      return Promise.allSettled(PRECACHE.map(url => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Not in cache — try network, then cache the response for next time
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Full offline fallback — serve index.html for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
