'use client';

import { useState, useEffect } from 'react';

export const DEFAULT_CLUB_LOGO = '/icons/icon-192x192.png';
const LOGO_STORAGE_KEY = 'baza_club_logo';

export function useClubLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOGO_STORAGE_KEY);
        if (saved && saved.startsWith('http')) {
          return saved;
        }
      } catch (e) {}
    }
    return DEFAULT_CLUB_LOGO;
  });

  useEffect(() => {
    let isMounted = true;
    let attempt = 0;
    const retryDelays = [0, 1000, 2000, 4000, 8000, 10000, 12000, 15000];

    const fetchLogoWithRetry = async () => {
      while (isMounted && attempt < retryDelays.length) {
        const delay = retryDelays[attempt];
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        if (!isMounted) break;

        try {
          const res = await fetch('/api/club/logo');
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.success && data.logoUrl && data.logoUrl.startsWith('http')) {
              setLogoUrl(data.logoUrl);
              try {
                localStorage.setItem(LOGO_STORAGE_KEY, data.logoUrl);
              } catch (e) {}
              break;
            }
          }
        } catch (err) {
          console.error(`Attempt ${attempt + 1} failed to load club logo:`, err);
        }
        attempt++;
      }
    };

    fetchLogoWithRetry();

    return () => {
      isMounted = false;
    };
  }, []);

  return logoUrl;
}
