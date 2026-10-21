const CACHE_NAME = 'baza-pwa-v9';
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/wL3hInXFOhhKd6RQyUOY.gif',
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Покерный Клуб БАЗА</title>
  <style>
    body { background-color: #090D16; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    h1 { margin-top: 0; font-size: 20px; color: #f8fafc; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
    button { background-color: #014373; color: white; border: none; padding: 12px 20px; font-weight: bold; border-radius: 12px; cursor: pointer; margin-top: 16px; width: 100%; font-size: 14px; }
    button:hover { background-color: #013357; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Покерный Клуб БАЗА</h1>
    <p>Приложение работает в автономном режиме или ожидает восстановления соединения. Проверьте интернет и нажмите «Обновить».</p>
    <button onclick="window.location.reload()">Обновить страницу</button>
  </div>
</body>
</html>`;

// Error loggers for ServiceWorker safety
self.addEventListener('error', (event) => {
  console.error('⚠️ [ServiceWorker Error]:', event.error || event.message);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('⚠️ [ServiceWorker UnhandledRejection]:', event.reason);
});

// Helper for LRU Cache Trimming (keep cache under maxItems)
async function limitCacheSize(cacheName, maxItems = 50) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      limitCacheSize(cacheName, maxItems);
    }
  } catch (err) {
    console.warn('LRU cache trimming warning:', err);
  }
}

// 1. Install Event - Safe pre-caching with Promise.allSettled & skipWaiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 [ServiceWorker] Pre-caching app shell assets safely');
        return Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            fetch(url)
              .then((response) => {
                if (response && response.status === 200) {
                  return cache.put(url, response);
                }
              })
              .catch((err) => {
                console.warn(`⚠️ Pre-cache failed for asset "${url}":`, err?.message || err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
      .catch((err) => console.error('❌ Install waitUntil error:', err))
  );
});

// 2. Activate Event - Claim clients and clean up ALL old/corrupted caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ [ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .catch((err) => console.error('❌ Activate waitUntil error:', err))
  );
});

// Message Event Handler for SKIP_WAITING and CLEAR_CACHES
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const type = typeof event.data === 'string' ? event.data : event.data.type;
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// 3. Fetch Event - Strategy: Stale-While-Revalidate for page navigation (instant cache load + background update)
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests or Google Sheets / API proxies
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) return;

  // Strategy A: Page navigation -> Network-Only (no HTML caching for auth-dependent page routes)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            return networkResponse;
          }
          return caches.match('/offline').then((offlinePage) => {
            return (
              offlinePage ||
              new Response(OFFLINE_HTML, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              })
            );
          });
        })
        .catch(() => {
          return caches.match('/offline').then((offlinePage) => {
            return (
              offlinePage ||
              new Response(OFFLINE_HTML, {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              })
            );
          });
        })
    );
    return;
  }

  // Strategy B: Static assets (next static chunks, icons, fonts, styles, images, manifest)
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('manifest')
  ) {
    const isNextChunk = url.pathname.startsWith('/_next/static/');

    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          if (!isNextChunk) {
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            } else if (networkResponse && networkResponse.status === 404 && isNextChunk) {
              caches.open(CACHE_NAME).then((cache) => cache.delete(request));
              self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                  client.postMessage({ type: 'CHUNK_LOAD_ERROR', url: url.href });
                });
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('⚠️ Asset fetch failed, network unavailable or blocked:', url.pathname, err?.message || err);
            return caches.match('/offline').then((offlineRes) => offlineRes || new Response('', { status: 408 }));
          });
      })
    );
    return;
  }
});

// 4. Push Event - Display notification with real icon
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    try {
      data = { title: 'Уведомление ПК БАЗА', body: event.data.text() };
    } catch (err) {
      data = { title: 'Уведомление ПК БАЗА', body: '' };
    }
  }

  const title = data.title || 'Покерный клуб БАЗА';

  let iconUrl = data.icon || '/icons/icon-192x192.png';
  let badgeUrl = data.badge || '/icons/icon-192x192.png';

  try {
    if (iconUrl && !iconUrl.startsWith('http')) {
      iconUrl = new URL(iconUrl, self.location.origin).href;
    }
    if (badgeUrl && !badgeUrl.startsWith('http')) {
      badgeUrl = new URL(badgeUrl, self.location.origin).href;
    }
  } catch (err) {
    console.warn('[sw] Error building absolute icon URL:', err);
  }

  const options = {
    body: data.body || '',
    icon: iconUrl,
    badge: badgeUrl,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch((err) => {
      console.error('[sw] showNotification error:', err);
    })
  );
});

// 5. Notification Click Event - Open or focus target window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawTargetUrl = event.notification.data?.url || '/';
  const targetFullUrl = new URL(rawTargetUrl, self.location.origin);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === targetFullUrl.origin && clientUrl.pathname === targetFullUrl.pathname) {
            if ('focus' in client) {
              return client.focus();
            }
          }
        } catch (e) {}
      }
      if (clients.openWindow) {
        return clients.openWindow(targetFullUrl.href);
      }
    })
  );
});
