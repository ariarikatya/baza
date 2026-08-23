'use client';

import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Award, Shield, Crown, Flame, Zap, Star } from 'lucide-react';

export default function HeraldryPage() {
  const statusRanks = [
    {
      status: 'ЧЕМПИОН',
      description: 'Топ-1 рейтинг сезона. Высший статус клуба, открывающий доступ к VIP-турнирам и спец-призам.',
      icon: Crown,
      color: 'text-amber-400',
    },
    {
      status: 'ЗОЛОТОЙ ИГРОК',
      description: 'Топ 2-5 рейтинга. Стабильные призовые места и высочайший уровень игры.',
      icon: Star,
      color: 'text-yellow-400',
    },
    {
      status: 'МОНСТР',
      description: 'Агрессивные игроки с наибольшим количеством выбитых баунти за месяц.',
      icon: Flame,
      color: 'text-purple-400',
    },
    {
      status: 'ИГРОК',
      description: 'Базовый статус всех зарегистрированных участников клуба БАЗА.',
      icon: Zap,
      color: 'text-blue-400',
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Геральдика и Титулы</h1>
            <p className="text-xs text-muted-foreground">Система званий, бейджей и наград покерного клуба "БАЗА"</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statusRanks.map((rank, idx) => {
            const Icon = rank.icon;
            return (
              <div key={idx} className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4 hover:border-brand transition-colors">
                <div className="flex items-center justify-between">
                  <StatusBadge status={rank.status} />
                  <Icon className={`w-6 h-6 ${rank.color}`} />
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{rank.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
