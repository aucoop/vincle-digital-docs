// Deja la app lista para usar sin conexión. El flujo se pide primero a la red
// para que los cambios de flujo.yaml lleguen en cuanto hay conexión.

const CACHE_PREFIX = 'vincle-guia-';
const CACHE = `${CACHE_PREFIX}v24`;
const ARCHIVOS = [
  './', 'index.html', 'app.css', 'app.js', 'qrcode-ui.js', 'flujo.json', 'manifest.webmanifest',
  'icono.svg', 'icono-192.png', 'icono-512.png',
  'vendor/qrcode/index.js', 'vendor/qrcode/QR8bitByte.js',
  'vendor/qrcode/QRBitBuffer.js', 'vendor/qrcode/QRErrorCorrectLevel.js',
  'vendor/qrcode/QRMaskPattern.js', 'vendor/qrcode/QRMath.js',
  'vendor/qrcode/QRMode.js', 'vendor/qrcode/QRPolynomial.js',
  'vendor/qrcode/QRRSBlock.js', 'vendor/qrcode/QRUtil.js',
  'diagramas/INBOX.png', 'diagramas/VISUAL_INSPECTION.png',
  'diagramas/PENDING_DONOR.png', 'diagramas/INSTALL.png', 'diagramas/TEST.png',
  'diagramas/REPAIR.png', 'diagramas/PACKAGING.png', 'diagramas/DONATION.png',
  'diagramas/IN_USE.png', 'diagramas/DISMANTLE.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((claves) => Promise.all(claves
      .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
      .map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== location.origin) return;

  // Red primero para todo lo propio: con conexión siempre la última versión,
  // sin conexión lo guardado.
  ev.respondWith(
    fetch(ev.request)
      .then(async (resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          const cache = await caches.open(CACHE);
          await cache.put(ev.request, copia);
        }
        return resp;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true }))
  );
});
