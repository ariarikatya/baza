'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOGO_ANIMATION = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/wL3hInXFOhhKd6RQyUOY.gif';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedUser = localStorage.getItem('baza_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && (parsed['Авторизован?'] || parsed.authorized)) {
            router.push('/home');
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute w-72 h-72 bg-[#014373]/30 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-72 h-72 bg-[#014373]/20 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none" />

      <div className="flex flex-col items-center z-10 text-center">
        <div className="w-40 h-40 mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-[#014373]/40 border border-[#014373]/30 bg-gray-900 flex items-center justify-center">
          <img
            src={LOGO_ANIMATION}
            alt="БАЗА Animation"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image load fails
              (e.target as HTMLImageElement).src = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';
            }}
          />
        </div>

        <h1 className="text-4xl font-extrabold tracking-wider text-white mb-2">
          ПОКЕРНЫЙ КЛУБ <span className="text-[#014373] drop-shadow-[0_0_15px_rgba(1,67,115,0.8)]">БАЗА</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-xs mb-8">
          Премиальный покерный клуб. Турниры, аналитика, баунти и статус.
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
