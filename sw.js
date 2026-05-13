/**
 * sw.js — Service Worker for offline PWA support
 * Caches app shell for offline use
 */

const CACHE = 'crstats-v7';
const SHELL = [
  './',
  './index.html',
  './js/cards.js',
  './js/crypto.js',
  './js/auth.js',
  './js/api.js',
  './js/analytics.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network-First Strategy for everything
  // Isso garante que o usuário sempre receba a versão mais nova se estiver online.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Se a rede estiver ok, clonamos e guardamos no cache
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Se falhar (offline), tenta buscar no cache
        return caches.match(e.request);
      })
  );
});
