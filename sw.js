const CACHE_NAME = 'zodchiy-v1.5.4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  // Форсируем обновление всех вкладок
  self.clients.claim().then(() => {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.navigate(client.url));
    });
  });
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('api.github.com') || url.pathname.includes('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return res;
      });
    })
  );
});