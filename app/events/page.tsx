'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow } from '@/types';
import { Sparkles, Clock } from 'lucide-react';

export default function EventsPage() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/sheets?sheet=АКЦИИ');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) setPromotions(json.data);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Акции и Спецсобытия</h1>
            <p className="text-xs text-muted-foreground">Все действующие бонусы, скидки и специальные мероприятия клуба</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promo, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-brand transition-colors"
              >
                <div>
                  <div className="relative h-48 bg-muted">
                    <img
                      src={promo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo['Название'] || 'Акция'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 bg-brand text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
                      {promo['Уведомление'] || 'АКЦИЯ'}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="text-lg font-bold text-foreground">{promo['Название']}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{promo['Описание']}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-border/50 mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    До: {promo['Дата окончания'] || 'Бессрочно'}
                  </span>
                  <span className="text-brand font-semibold">ПК БАЗА</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
