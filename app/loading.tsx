import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#014373] border-t-transparent animate-spin" />
          <span className="font-black text-xs text-[#014373] tracking-widest">БАЗА</span>
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide animate-pulse">
          Загрузка ПК БАЗА...
        </p>
      </div>
    </div>
  );
}
