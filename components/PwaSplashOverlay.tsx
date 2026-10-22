'use client';

import React, { useEffect, useState } from 'react';

// Module-level in-memory cache for split image
let imagePreloadPromise: Promise<void> | null = null;
let isImageLoadedInMemory = false;

function preloadSplitImage(): Promise<void> {
  if (isImageLoadedInMemory) return Promise.resolve();
  if (imagePreloadPromise) return imagePreloadPromise;

  if (typeof window !== 'undefined') {
    imagePreloadPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        isImageLoadedInMemory = true;
        resolve();
      };
      img.onerror = () => {
        // Fallback gracefully even on error
        resolve();
      };
      img.src = '/icons/split.gif';
    });
    return imagePreloadPromise;
  }
  return Promise.resolve();
}

export function PwaSplashOverlay() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(isImageLoadedInMemory);

  useEffect(() => {
    preloadSplitImage().then(() => {
      setGifLoaded(true);
    });

    let fadeTimer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;

    const handleAppReady = () => {
      setFading(true);
      hideTimer = setTimeout(() => {
        setHidden(true);
      }, 500);
    };

    // Listen for custom app:ready event
    window.addEventListener('app:ready', handleAppReady);

    // Fallback timer: maximum 15 seconds safety fallback
    const fallbackTimer = setTimeout(() => {
      handleAppReady();
    }, 15000);

    return () => {
      window.removeEventListener('app:ready', handleAppReady);
      clearTimeout(fallbackTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (hideTimer) clearTimeout(hideTimer);
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
          {/* Static placeholder logo so overlay never shows a blank dark container */}
          <img
            src="/icons/logo.png"
            alt="БАЗА Placeholder"
            className={`w-12 h-12 object-contain absolute transition-opacity duration-300 ${
              gifLoaded ? 'opacity-0' : 'opacity-80'
            }`}
          />
          {/* Animated split gif once preloaded/ready */}
          <img
            src="/icons/split.gif"
            alt="Загрузка…"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              gifLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => {
              isImageLoadedInMemory = true;
              setGifLoaded(true);
            }}
          />
          {/* CSS animated spinner ring around container edge for feedback independent of external assets */}
          <div className="absolute inset-0 border-2 border-transparent border-t-[#014373] border-r-[#014373] rounded-xl animate-spin pointer-events-none" />
        </div>
        <div className="flex flex-col items-center space-y-2">
          <h1 className="text-base font-black tracking-widest text-white">ПОКЕРНЫЙ КЛУБ БАЗА</h1>
          <div className="flex items-center space-x-2">
            {/* CSS loading dots */}
            <div className="w-1.5 h-1.5 bg-[#014373] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-[#014373] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-[#014373] rounded-full animate-bounce" />
            <p className="text-xs text-slate-300 font-medium tracking-wide animate-pulse">
              Данные загружаются…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
