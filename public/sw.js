// Service Worker — Registro de Treinos PWA
// Estratégia: Cache First para assets hashed, Network First para navegação e API
const CACHE_VERSION = 'v5';
const STATIC_CACHE = `workout-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `workout-dynamic-${CACHE_VERSION}`;

// Assets com nomes fixos (sem hash Vite) que devem ser pré-cacheados
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/maskable-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png',
  '/icons/pwa-192x192-maskable.png',
  '/icons/pwa-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/apple-touch-icon-180x180.png',
];

// ─── Install: pré-cacheia assets fixos ─────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: limpa caches de versões anteriores ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: estratégia por tipo de request ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar não-GET e outras origens (Supabase, Google Fonts, APIs externas)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // 1. Assets Vite hashed (/assets/...) → Cache First (são imutáveis por definição)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 2. Navegação (HTML) → Network First com fallback para shell offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 3. Assets estáticos fixos (favicon, ícones, manifest) → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Estratégia: Cache First ────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, network.clone());
  }
  return network;
}

// ─── Estratégia: Stale-While-Revalidate ────────────────────────────────────
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((network) => {
    if (network.ok) {
      caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, network.clone()));
    }
    return network;
  }).catch(() => cached);
  return cached || fetchPromise;
}

