'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ClubInfo } from '@/types';
import { HelpCircle, MapPin, Phone, Clock, Mail, ExternalLink } from 'lucide-react';

export default function AboutPage() {
  const [clubInfo, setClubInfo] = useState<ClubInfo | null>(null);

  useEffect(() => {
    fetch('/api/sheets?sheet=КЛУБ')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && json.data.length > 0) setClubInfo(json.data[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">О Клубе "БАЗА"</h1>
            <p className="text-xs text-muted-foreground">История, миссия и контакты нашего соообщества</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 shadow-lg">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">{clubInfo?.name || 'Покерный Клуб "БАЗА"'}</h2>
            <p className="text-sm text-brand-light font-semibold">{clubInfo?.tagline || 'Экосистема для истинных любителей спортивного покера'}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {clubInfo?.description ||
                'Клуб "БАЗА" создавался как закрытое содружество любителей и профессионалов покера. Мы обеспечиваем комфортные условия, квалифицированных дилеров, профессиональное оборудование и прозрачную систему рейтинга на базе онлайн-сервисов.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border">
            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <MapPin className="w-6 h-6 text-brand" />
              <div>
                <p className="text-xs text-muted-foreground">Адрес</p>
                <p className="text-sm font-semibold text-foreground">{clubInfo?.address || 'г. Москва, ул. Тверская, д. 15'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <Phone className="w-6 h-6 text-brand" />
              <div>
                <p className="text-xs text-muted-foreground">Телефон</p>
                <p className="text-sm font-semibold text-foreground">{clubInfo?.phone || '+7 (495) 000-77-88'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <Clock className="w-6 h-6 text-brand" />
              <div>
                <p className="text-xs text-muted-foreground">Часы работы</p>
                <p className="text-sm font-semibold text-foreground">{clubInfo?.workingHours || 'Ежедневно 16:00 - 05:00'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-xl">
              <Mail className="w-6 h-6 text-brand" />
              <div>
                <p className="text-xs text-muted-foreground">Telegram Канал</p>
                <p className="text-sm font-semibold text-foreground">@baza_poker_club</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
