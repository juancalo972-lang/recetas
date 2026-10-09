// Guarda la app en el celular para que abra sin internet.
// Al publicar cambios, sube el número de CACHE para que los celulares bajen la versión nueva.
const CACHE = 'que-cocino-v9';
const FOTOS = 'que-cocino-fotos-v1';
const ARCHIVOS = [
  './',
  'index.html',
  'styles.css',
  'recetas.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE && k !== FOTOS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde rápido con lo guardado y, por detrás, trae la versión nueva para la próxima vez.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Fotos de los videos (YouTube): se guardan la primera vez para verlas sin internet
  if (new URL(req.url).hostname === 'i.ytimg.com') {
    e.respondWith(caches.open(FOTOS).then(async cache => {
      const guardada = await cache.match(req);
      if (guardada) return guardada;
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const guardado = await cache.match(req, { ignoreSearch: true });
      const red = fetch(req)
        .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => guardado);
      return guardado || red;
    })
  );
});
