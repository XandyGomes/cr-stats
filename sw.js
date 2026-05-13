/**
 * sw.js — Service Worker for offline PWA support
 * Caches app shell for offline use
 */

const CACHE = 'crstats-v6';
const SHELL = [
  './',
  './index.html',
  // CSS served network-first (never cached) to always get latest styles
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
  // Network-first: chamadas de API (/api/*) e URLs externas
  const url = new URL(e.request.url);
  const isApiCall = url.pathname.startsWith('/api/') ||
                    url.hostname.includes('clashroyale') ||
                    url.hostname.includes('googleapis.com') ||
                    url.hostname.includes('jsdelivr');

  if (isApiCall) {
    // Always network for API
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
  } else {
    // Cache-first for shell
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
  }
});
