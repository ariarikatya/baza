const CACHE_NAME = 'baza-pwa-v6';
const PRECACHE_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/192.png',
  '/icons/512.png',
  '/icons/apple-touch-icon.png',
];

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

// Helper for Network-first with timeout for navigation
function fetchWithTimeout(request, timeoutMs = 3500) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => {
      reject(new Error('Network request timed out'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// 3. Fetch Event - Strategy: Network-first for pages with timeout & offline fallback, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests or Google Sheets / API proxies
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) return;

  // Strategy A: Page navigation -> Network-first with timeout, fallback to Cache or /offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetchWithTimeout(request, 3500)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(CACHE_NAME, 50);
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse && cachedResponse.status === 200) return cachedResponse;
            return caches.match('/offline').then((offlinePage) => {
              return (
                offlinePage ||
                caches.match('/') ||
                new Response('Offline', {
                  status: 503,
                  headers: { 'Content-Type': 'text/html; charset=utf-8' },
                })
              );
            });
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
    data = { title: 'Уведомление ПК БАЗА', body: event.data.text() };
  }

  const title = data.title || 'Покерный клуб БАЗА';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/192.png',
    badge: data.badge || '/icons/192.png',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event - Open or focus target window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
