'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Promotion, ClubInfo } from '@/types';
import { Sparkles, MapPin, Phone, Clock, ExternalLink } from 'lucide-react';

export default function HomePage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);
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
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-brand-light p-6 md:p-10 shadow-xl border border-border">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold mb-3 backdrop-blur-sm">
              Добро пожаловать в ПК "БАЗА"
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {clubInfo?.name || 'Покерный Клуб "БАЗА"'}
            </h1>
            <p className="mt-3 text-sm md:text-base text-blue-100 max-w-xl leading-relaxed">
              {clubInfo?.tagline || 'Место встречи профессионалов и любителей покера. Ежедневные турниры, прозрачные рейтинги и честная игра.'}
            </p>
          </div>
          <div className="absolute right-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
            <div className="w-96 h-96 rounded-full bg-white blur-3xl"></div>
          </div>
        </div>

        {/* Club Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <MapPin className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Адрес клуба</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.address || 'г. Москва, ул. Тверская, д. 15'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <Phone className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Телефон для брони</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.phone || '+7 (495) 000-77-88'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <Clock className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Режим работы</p>
              <p className="text-sm font-semibold text-foreground">{clubInfo?.workingHours || 'Ежедневно 16:00 - 05:00'}</p>
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
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-brand transition-all duration-300 shadow-md flex flex-col"
                >
                  <div className="relative h-40 overflow-hidden bg-muted">
                    <img
                      src={promo.imageUrl || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-brand/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                      {promo.badgeText || 'АКЦИЯ'}
                    </span>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-base group-hover:text-brand transition-colors line-clamp-1">
                        {promo.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {promo.description}
                      </p>
                    </div>
                    {promo.validUntil && (
                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Действует до:</span>
                        <span className="font-medium text-foreground">{promo.validUntil}</span>
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
