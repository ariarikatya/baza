'use client';

import { useState, useEffect } from 'react';

export const DEFAULT_CLUB_LOGO = '/icons/icon-192x192.png';

export function useClubLogo(): string {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_CLUB_LOGO);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/club/logo')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      })
      .catch((err) => console.error('Failed to load club logo:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  return logoUrl;
}
