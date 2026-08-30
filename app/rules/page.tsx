'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { ScrollText, ShieldCheck, AlertCircle, Award } from 'lucide-react';

const RULES_PDF_URL = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/VvUZFtDqb4Lc9iJ42A7H.pdf';

export default function RulesPage() {
  const rules = [
    {
      title: '1. Общие положения',
      content: 'Покерный клуб «БАЗА» проводит турниры по спортивному покеру согласно международным правилам TDA. Каждый игрок обязан ознакомиться с правилами клуба до начала соревнований.',
    },
    {
      title: '2. Конфиденциальность',
      content: 'Клуб гарантирует сохранность персональных данных игроков. Запрещена видеосъемка карманных карт и закрытых зон без согласия администрации.',
    },
    {
      title: '3. Правила игры за столом',
      content: 'Все заявки (ставка, рейз, фолд) делаются строго по очереди. Уважительное отношение к дилерам и соперникам строго обязательно. Сговор (soft play) влечет дисквалификацию.',
    },
    {
      title: '4. Ответственность и споры',
      content: 'Решение турнирного директора (TD) является окончательным во всех спорных ситуациях за столом. Начисление рейтинговых очков производится автоматически.',
    },
    {
      title: '5. Прекращение участия',
      content: 'Администрация оставляет за собой право отказать в обслуживании или ограничить доступ в клуб игрокам, нарушающим правила этикета или находящимся в нетрезвом состоянии.',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <ScrollText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">ПРАВИЛА КЛУБА «БАЗА»</h1>
              <p className="text-xs text-muted-foreground">Редакция от 13.02.2026 • Официальное соглашение и кодекс клуба</p>
            </div>
          </div>

          <a
            href={RULES_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            <ScrollText className="w-4 h-4" />
            <span>Скачать PDF</span>
          </a>
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
