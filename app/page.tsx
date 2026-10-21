'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_ANIMATION = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/wL3hInXFOhhKd6RQyUOY.gif';

export default function SplashPage() {
  const router = useRouter();
  const [animationUrl, setAnimationUrl] = useState(DEFAULT_ANIMATION);

  useEffect(() => {
    let isMounted = true;

    // Check localStorage cache first
    try {
      const cachedLogo = localStorage.getItem('baza_club_logo');
      if (cachedLogo && cachedLogo.startsWith('http')) {
        setAnimationUrl(cachedLogo);
      }
    } catch (e) {}

    // 1. Fetch animation or logo from "КЛУБ" with 15s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const loadMedia = async () => {
      try {
        const [sheetsRes, logoRes] = await Promise.allSettled([
          fetch('/api/sheets?sheet=КЛУБ', { signal: controller.signal }),
          fetch('/api/club/logo', { signal: controller.signal }),
        ]);

        if (!isMounted) return;

        let foundAnimation = '';
        let foundLogo = '';

        if (sheetsRes.status === 'fulfilled') {
          const data = await sheetsRes.value.json().catch(() => ({}));
          if (data.success && data.data && data.data[0] && data.data[0]['Анимация']) {
            foundAnimation = data.data[0]['Анимация'];
          }
        }

        if (logoRes.status === 'fulfilled') {
          const data = await logoRes.value.json().catch(() => ({}));
          if (data.success && data.logoUrl) {
            foundLogo = data.logoUrl;
            try {
              localStorage.setItem('baza_club_logo', data.logoUrl);
            } catch (e) {}
          }
        }

        const targetUrl = foundAnimation || foundLogo;
        if (isMounted && targetUrl && targetUrl.startsWith('http')) {
          setAnimationUrl(targetUrl);
        }
      } catch (err: any) {
        console.warn('Splash animation/logo fetch error:', err?.message || err);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    loadMedia();

    // 2. Perform async session check and navigate IMMEDIATELY without artificial delay
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
      clearTimeout(timeoutId);
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
