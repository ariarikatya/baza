'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_ANIMATION = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/wL3hInXFOhhKd6RQyUOY.gif';

export default function SplashPage() {
  const router = useRouter();

  const [animationUrl, setAnimationUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedLogo = localStorage.getItem('baza_club_logo');
        if (cachedLogo && cachedLogo.startsWith('http')) {
          return cachedLogo;
        }
      } catch (e) {}
    }
    return DEFAULT_ANIMATION;
  });

  const [mediaReady, setMediaReady] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedLogo = localStorage.getItem('baza_club_logo');
        if (cachedLogo && cachedLogo.startsWith('http')) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  });

  const mediaReadyRef = useRef<boolean>(mediaReady);

  const updateMediaReady = (ready: boolean) => {
    mediaReadyRef.current = ready;
    setMediaReady(ready);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch logo from "КЛУБ" with retry loop
    const retryDelays = [0, 1000, 2000, 4000, 8000, 10000, 12000, 15000];

    const loadMediaWithRetry = async () => {
      let attempt = 0;
      while (isMounted && attempt < retryDelays.length) {
        const delay = retryDelays[attempt];
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
        if (!isMounted) break;

        try {
          const logoRes = await fetch('/api/club/logo');
          if (!isMounted) break;

          if (logoRes.ok) {
            const data = await logoRes.json().catch(() => ({}));
            if (data.success && data.logoUrl && data.logoUrl.startsWith('http')) {
              setAnimationUrl(data.logoUrl);
              try {
                localStorage.setItem('baza_club_logo', data.logoUrl);
              } catch (e) {}
              updateMediaReady(true);
              break;
            }
          }
        } catch (err: any) {
          console.warn(`Splash media fetch attempt ${attempt + 1} failed:`, err?.message || err);
        }
        attempt++;
      }

      if (isMounted) {
        updateMediaReady(true);
      }
    };

    loadMediaWithRetry();

    // 2. Perform async session check in parallel without waiting for media
    const checkUserSession = async () => {
      try {
        const { getSavedUserSession, restoreUserSessionAsync } = await import('@/lib/session');
        let parsed = getSavedUserSession();
        if (!parsed) {
          parsed = await restoreUserSessionAsync();
        }

        if (!isMounted) return;

        if (parsed && (parsed['User ID'] || parsed['Ник'])) {
          const isBanned =
            parsed['Бан'] === true ||
            String(parsed['Бан'] || '').toLowerCase() === 'true' ||
            String(parsed['Бан'] || '') === '1';

          if (!isBanned) {
            router.replace('/home');
            return;
          }
        }
        router.replace('/login');
      } catch (e) {
        console.error('Session check error on splash:', e);
        if (isMounted) router.replace('/login');
      }
    };

    checkUserSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col items-center justify-center p-4 pt-safe pb-safe relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute w-72 h-72 bg-[#014373]/30 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-72 h-72 bg-[#014373]/20 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none" />

      <div className="flex flex-col items-center z-10 text-center">
        <div className="w-40 h-40 mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-[#014373]/40 border border-[#014373]/30 bg-gray-900 flex items-center justify-center relative">
          {/* Local placeholder icon so slow networks never show a blank dark screen */}
          <img
            src="/icons/icon-192x192.png"
            alt="БАЗА Placeholder"
            className="w-20 h-20 object-contain absolute opacity-60"
          />
          <img
            src={animationUrl}
            alt="БАЗА Animation"
            className="w-full h-full object-cover relative z-10"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_ANIMATION;
            }}
          />
        </div>

        <h1 className="text-4xl font-extrabold tracking-wider text-white mb-2">
          КЛУБ <span className="text-[#014373] drop-shadow-[0_0_15px_rgba(1,67,115,0.8)]">БАЗА</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-xs mb-8">
          Приложение клуба. Турниры, аналитика, баунти и статус.
        </p>

        {/* Loading Spinner */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#014373] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-[#014373] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-[#014373] rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
