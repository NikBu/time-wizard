const CACHE = 'timewizard-v1';
const FILES = ['/', './index.html', './assets/arch_idle.png', ...];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)))
);
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
