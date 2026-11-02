const CACHE_NAME = 'tablaquiz-v3';
const ASSETS = ['./', './index.html', './styles.css?v=3', './elements.js?v=3', './app.js?v=3', './zenban-plugin-sdk.js?v=3', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('tablaquiz-') && k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Primero la red, y la caché si no hay conexión.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then((res) => {
    const copia = res.clone();
    caches.open(CACHE_NAME).then((c) => c.put(req, copia)).catch(() => {});
    return res;
  }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
});
