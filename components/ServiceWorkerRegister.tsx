'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker auto-registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('❌ ServiceWorker auto-registration failed:', err);
        });
    }
  }, []);

  return null;
}
