'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ScrollText, ShieldCheck, AlertCircle, Award } from 'lucide-react';

export default function RulesPage() {
  const rules = [
    {
      title: '1. Вежливость и честная игра',
      content: 'Каждый игрок обязан уважать участников турнира и персонал. Любые оскорбления, неэтичное поведение или явный сговор (soft play) строжайше запрещены.',
    },
    {
      title: '2. Порядок действий за столом',
      content: 'Все заявки (ставка, рейз, фолд) делаются строго по очереди. Голосовая заявка имеет приоритет над движением фишек.',
    },
    {
      title: '3. Использование гаджетов',
      content: 'Запрещается использование мобильных телефонов во время участия в раздаче. При раздаче карт телефон должен быть убран.',
    },
    {
      title: '4. Рейтинг и Очки',
      content: 'Начисление очков происходит по официальной формуле клуба с учетом занятого места и количества участников в турнире.',
    },
    {
      title: '5. Дисквалификация',
      content: 'Администрация оставляет за собой право дисквалифицировать любого игрока за грубые нарушения правил без возврата бай-ина.',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <ScrollText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Правила ПК "БАЗА"</h1>
            <p className="text-xs text-muted-foreground">Кодекс чести и официальный регламент соревнований</p>
          </div>
        </div>

        <div className="space-y-4">
          {rules.map((rule, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-2">
              <h3 className="text-lg font-bold text-brand-light flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                {rule.title}
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed pl-7">{rule.content}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
