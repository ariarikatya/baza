'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow, ClubRow } from '@/types';
import { Sparkles, Phone, Clock, MessageSquare } from 'lucide-react';

const DEFAULT_LOGO = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';

export default function HomePage() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [promRes, clubRes] = await Promise.all([
          fetch('/api/sheets?sheet=АКЦИИ'),
          fetch('/api/sheets?sheet=КЛУБ'),
        ]);

        const promData = await promRes.json();
        const clubData = await clubRes.json();

        if (promData.data) setPromotions(promData.data);
        if (clubData.data && clubData.data.length > 0) setClubInfo(clubData.data[0]);
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Banner with Club Logo from Клуб sheet */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#014373]/90 via-[#014373] to-gray-900 p-6 md:p-10 shadow-xl border border-gray-800">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <img
              src={clubInfo?.['Логотип'] || DEFAULT_LOGO}
              alt="Логотип БАЗА"
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-[#014373] object-cover shadow-2xl shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
            />
            <div className="max-w-2xl text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-2 backdrop-blur-sm">
                Добро пожаловать в ПК "БАЗА"
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Покерный Клуб "БАЗА"
              </h1>
              <p className="mt-2 text-sm md:text-base text-blue-100 max-w-xl leading-relaxed">
                {clubInfo?.['О клубе'] || 'Место встречи профессионалов и любителей покера. Ежедневные турниры, прозрачные рейтинги и честная игра.'}
              </p>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
            <div className="w-96 h-96 rounded-full bg-white blur-3xl"></div>
          </div>
        </div>

        {/* Club Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <Phone className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Телефон для связи</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.['Телефон'] || '+7 (495) 000-77-88'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <MessageSquare className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Поддержка в Telegram</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.['Поддержка'] || '@baza_support'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <Clock className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Версия приложения</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.['Приложение'] || 'БАЗА v1.0'}</p>
            </div>
          </div>
        </div>

        {/* Promotions Grid */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Акции и Спецпредложения</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {promotions.map((promo, idx) => (
                <div
                  key={idx}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-brand transition-all duration-300 shadow-md flex flex-col"
                >
                  <div className="relative h-40 overflow-hidden bg-muted">
                    <img
                      src={promo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo['Название'] || 'Акция'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-brand/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                      {promo['Уведомление'] || 'АКЦИЯ'}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-base group-hover:text-brand transition-colors line-clamp-1">
                        {promo['Название']}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {promo['Описание']}
                      </p>
                    </div>
                    {promo['Дата окончания'] && (
                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Действует до:</span>
                        <span className="font-medium text-foreground">{promo['Дата окончания']}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
