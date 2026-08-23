'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ClubRow } from '@/types';
import { HelpCircle, Phone, MessageSquare, ShieldCheck, Trophy, HeartHandshake } from 'lucide-react';

const DEFAULT_LOGO = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';

export default function AboutPage() {
  const [club, setClub] = useState<ClubRow | null>(null);

  useEffect(() => {
    fetch('/api/sheets?sheet=КЛУБ')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) setClub(json.data[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">О Покерном Клубе "БАЗА"</h1>
            <p className="text-xs text-muted-foreground">История, миссия и контакты нашего сообщества</p>
          </div>
        </div>

        {/* Hero About */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img
              src={club?.['Логотип'] || DEFAULT_LOGO}
              alt="БАЗА Logo"
              className="w-32 h-32 rounded-2xl border-2 border-brand object-cover shadow-xl shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
            />
            <div className="space-y-3 text-center md:text-left">
              <h2 className="text-2xl font-extrabold text-foreground">Премиальный Спортивный Покер</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {club?.['О клубе'] ||
                  'Покерный клуб "БАЗА" — это современная площадка для любителей и профессионалов спортивного покера. Мы объединяем честную игру, прозрачные рейтинги, автоматизированную аналитику и дружескую атмосферу.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h4 className="font-bold text-xs text-foreground">Честные Правила</h4>
                <p className="text-[11px] text-muted-foreground">Строгий регламент и поддержка</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <Trophy className="w-6 h-6 text-amber-400" />
              <div>
                <h4 className="font-bold text-xs text-foreground">Сезонные Кубки</h4>
                <p className="text-[11px] text-muted-foreground">Крупные турниры каждые 3 месяца</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <HeartHandshake className="w-6 h-6 text-purple-400" />
              <div>
                <h4 className="font-bold text-xs text-foreground">Сообщество</h4>
                <p className="text-[11px] text-muted-foreground">Чат игрового клуба и Telegram</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <Phone className="w-8 h-8 text-brand shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Телефон клуба</p>
              <p className="text-base font-bold text-foreground">{club?.['Телефон'] || '+7 (495) 000-77-88'}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4">
            <MessageSquare className="w-8 h-8 text-brand shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Поддержка в Telegram</p>
              <p className="text-base font-bold text-foreground">{club?.['Поддержка'] || '@baza_support'}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
