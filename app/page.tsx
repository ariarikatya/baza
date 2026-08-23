'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = localStorage.getItem('baza_user');
      if (user) {
        router.push('/home');
      } else {
        router.push('/login');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="w-24 h-24 rounded-3xl bg-brand flex items-center justify-center font-bold text-white text-5xl shadow-2xl shadow-brand/50 border border-brand-light">
          Б
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-wider text-foreground">
            ПОКЕРНЫЙ КЛУБ <span className="text-brand-light">"БАЗА"</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Экосистема для истинных игроков</p>
        </div>
        <Loader2 className="w-8 h-8 text-brand animate-spin mt-4" />
      </div>
    </div>
  );
}
