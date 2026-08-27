// Minimal service worker so the game can be installed as an app (PWA) and
// cached for faster re-loads. Network-first for navigations, cache-first for
// the static assets under /_next. This keeps online co-op working normally.
const CACHE = 'syo-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => {
    if (k !== CACHE) return caches.delete(k);
  })).then(() => self.clients.claim())));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Let WebRTC/PeerJS signaling and cross-origin requests pass through untouched.
  if (url.origin !== location.origin) return;
  // Network-first for the page and HTML; cache fallback to offline shell.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
    return;
  }
  // Cache-first for static assets.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
