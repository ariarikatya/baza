'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for SW chunk load errors
    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'CHUNK_LOAD_ERROR') {
          console.warn('⚠️ Chunk load error reported by SW, reloading page...');
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // Global listeners for chunk load errors on client
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      if (
        msg.includes('Loading chunk') ||
        msg.includes('ChunkLoadError') ||
        msg.includes('Failed to fetch dynamically imported module')
      ) {
        console.warn('⚠️ Client-side ChunkLoadError detected, reloading page...');
        window.location.reload();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event?.reason || '');
      if (
        reason.includes('Loading chunk') ||
        reason.includes('ChunkLoadError') ||
        reason.includes('Failed to fetch dynamically imported module')
      ) {
        console.warn('⚠️ Client-side ChunkLoadError unhandled rejection, reloading page...');
        window.location.reload();
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker auto-registered with scope:', reg.scope);

          // If there is a waiting worker, send SKIP_WAITING message
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New ServiceWorker installed, activating immediately.');
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              };
            }
          };

          // Periodically check for SW updates every hour
          const updateInterval = setInterval(() => {
            reg.update().catch((e) => console.warn('SW update check failed:', e));
          }, 3600000);

          // Check for SW update when returning to app (visibilitychange)
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch((e) => console.warn('SW update check on visible failed:', e));
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);
        })
        .catch((err) => {
          console.error('❌ ServiceWorker auto-registration failed:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}
