'use client';

import React from 'react';
import { X, Smartphone } from 'lucide-react';
import { useClubLogo } from '@/lib/useClubLogo';

interface PwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaModal: React.FC<PwaModalProps> = ({ isOpen, onClose }) => {
  const logoUrl = useClubLogo();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pt-safe pb-safe backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Логотип БАЗА"
            className="w-10 h-10 rounded-xl border border-sky-500/40 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = '/icons/icon-192x192.png'; }}
          />
          <div>
            <h3 className="text-lg font-bold text-white">Установить приложение</h3>
            <p className="text-xs text-slate-400">Покерный Клуб «БАЗА»</p>
          </div>
        </div>
        <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
          <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
            <p className="font-bold text-white mb-1">iOS (Safari)</p>
            <p>1. Нажмите «Поделиться» (стрелка вверх)</p>
            <p>2. Выберите «На экран Домой»</p>
            <p>3. Нажмите «Добавить»</p>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
            <p className="font-bold text-white mb-1">Android (Chrome)</p>
            <p>1. Нажмите в правом верхнем углу</p>
            <p>2. «Добавить на главный экран»</p>
            <p>3. Подтвердите установку</p>
          </div>
        </div>
      </div>
    </div>
  );
};
