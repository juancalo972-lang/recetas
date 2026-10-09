// Guarda la app en el celular para que abra sin internet.
// Al publicar cambios, sube el número de CACHE para que los celulares bajen la versión nueva.
const CACHE = 'que-cocino-v1';
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
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde rápido con lo guardado y, por detrás, trae la versión nueva para la próxima vez.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
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
