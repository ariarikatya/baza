'use client';

import React, { useEffect, useState } from 'react';

export function PwaSplashOverlay() {
  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Short timer to smooth out hydration and session check
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 400);

    const hideTimer = setTimeout(() => {
      setHidden(true);
    }, 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#090D16] flex flex-col items-center justify-center p-4 transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#090D16' }}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-20 h-20 rounded-xl border border-[#014373] overflow-hidden bg-slate-900 flex items-center justify-center shadow-xl shadow-[#014373]/30">
          <img
            src="/icons/split.gif"
            alt="Загрузка…"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col items-center space-y-1">
          <h1 className="text-base font-black tracking-widest text-white">ПОКЕРНЫЙ КЛУБ БАЗА</h1>
          <p className="text-xs text-slate-300 font-medium tracking-wide animate-pulse">
            Данные загружаются…
          </p>
        </div>
      </div>
    </div>
  );
}
