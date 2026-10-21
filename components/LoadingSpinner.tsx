'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
  text = 'Данные загружаются…',
  fullScreen = false,
  className = '',
  size = 'md',
}: LoadingSpinnerProps) {
  const imageSizeClass =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  const container = (
    <div className={`flex flex-col items-center justify-center p-4 space-y-3 text-center ${className}`}>
      <div className={`relative ${imageSizeClass} flex items-center justify-center overflow-hidden rounded-xl border border-brand/30 bg-slate-900/60 shadow-lg shadow-brand/10`}>
        <img
          src="/icons/split.gif"
          alt="Загрузка…"
          className="w-full h-full object-cover"
        />
      </div>
      {text && (
        <p className="text-xs text-slate-300 font-medium tracking-wide animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#090D16] flex flex-col items-center justify-center p-4">
        {container}
      </div>
    );
  }

  return container;
}

export default LoadingSpinner;
