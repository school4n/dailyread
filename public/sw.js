// Service Worker for DailyRead PWA
// public/sw.js

const CACHE_NAME = 'dailyread-v1';
const API_CACHE_NAME = 'dailyread-api-v1';
const IMAGE_CACHE_NAME = 'dailyread-images-v1';

// App shell resources to cache on install
const APP_SHELL = [
  '/',
  '/bookmarks',
  '/search',
  '/settings',
  '/categories',
  '/manifest.json',
];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Failed to cache app shell:', err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (![CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME].includes(name)) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and chrome extensions
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  
  // API requests: Network first, fall back to cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/worker/')) {
    event.respondWith(networkFirstWithCache(event.request, API_CACHE_NAME, 300)); // 5 min
    return;
  }
  
  // Images: Cache first
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/) ||
    url.hostname !== self.location.hostname
  ) {
    event.respondWith(cacheFirstWithFallback(event.request, IMAGE_CACHE_NAME));
    return;
  }
  
  // HTML pages: Network first with offline fallback
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOffline(event.request));
    return;
  }
  
  // Static assets: Cache first
  if (url.pathname.match(/\.(js|css|woff|woff2|ttf)$/)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function networkFirstWithCache(request, cacheName, maxAgeSeconds = 300) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }
}

async function cacheFirstWithFallback(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}

async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DailyRead - Offline</title>
<style>
body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; color: #333; text-align: center; padding: 20px; }
h1 { font-size: 24px; margin-bottom: 12px; }
p { color: #666; margin-bottom: 20px; }
a { color: #1a73e8; text-decoration: none; }
</style>
</head>
<body>
<h1>📵 Không có kết nối</h1>
<p>DailyRead cần kết nối internet để tải tin tức mới.<br>Hãy kiểm tra kết nối và thử lại.</p>
<a href="/">Thử lại</a>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 404 });
  }
}
