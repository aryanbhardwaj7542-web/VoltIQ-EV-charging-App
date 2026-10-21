/**
 * VoltIQ Progressive Web App Service Worker
 * Indian EV Charging Intelligence & Offline Highway Dead-Zone Resilience
 * Version: 3.0.0
 */

const STATIC_CACHE_NAME = 'voltiq-static-v3';
const API_CACHE_NAME = 'voltiq-api-v3';
const TILE_CACHE_NAME = 'voltiq-tiles-v3';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

// Install Event: Pre-cache core shell & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[VoltIQ SW] Pre-caching static app shell (v3)');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[VoltIQ SW] Pre-cache warning:', err);
      });
    })
  );
});

// Activate Event: Cleanup stale caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== API_CACHE_NAME &&
            cacheName !== TILE_CACHE_NAME
          ) {
            console.log('[VoltIQ SW] Purging obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent offline caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and WebSocket upgrades
  if (request.method !== 'GET' || url.protocol.startsWith('ws')) {
    return;
  }

  // Strategy 1: Map Tiles (Stale-While-Revalidate for offline map viewing)
  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('basemaps.cartocdn.com')) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategy 2: Critical API Requests (Network-First with Offline Highway Dead-Zone Cache Fallback)
  if (url.pathname.startsWith('/api/stations') || url.pathname.startsWith('/api/emergency')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          console.log('[VoltIQ SW] Network down (Highway Dead-Zone). Serving emergency station cache for:', url.pathname);
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // If no exact match, try matching any /api/stations cache
          const apiCache = await caches.open(API_CACHE_NAME);
          const keys = await apiCache.keys();
          const stationKey = keys.find(k => k.url.includes('/api/stations'));
          if (stationKey) {
            return apiCache.match(stationKey);
          }
          return new Response(JSON.stringify({
            offline: true,
            message: 'Offline mode active: No local cache for this route.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Strategy 3: Static App Shell & Assets (Network-First with Offline Cache Fallback)
  // Ensures fresh CSS, JS, and HTML on reload while preserving offline PWA capability
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.url.startsWith('http')) {
          const responseToCache = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Offline Fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (request.headers.get('accept')?.includes('text/html') || request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});
