'use client';

import React from 'react';
import { WifiOff, RotateCw } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
        <WifiOff className="w-10 h-10 text-sky-400" />
      </div>

      <h1 className="text-2xl font-bold mb-2">Нет соединения с сетью</h1>
      <p className="text-slate-400 text-sm max-w-md mb-8">
        Приложение БАЗА находится в автономном режиме. Проверьте подключение к интернету и повторите попытку.
      </p>

      <button
        onClick={handleReload}
        className="px-6 py-3 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl flex items-center gap-2 text-sm transition min-h-[44px] shadow-lg shadow-[#014373]/30"
      >
        <RotateCw className="w-4 h-4" />
        <span>Обновить страницу</span>
      </button>
    </div>
  );
}
