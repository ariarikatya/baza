'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
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
