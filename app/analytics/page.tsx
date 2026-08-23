'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsData } from '@/types';
import { BarChart3, TrendingUp, Users, Trophy, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);

  useEffect(() => {
    fetch('/api/sheets?sheet=АНАЛИТИКА')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setAnalytics(json.data);
      })
      .catch((err) => console.error(err));
  }, []);

  const defaultMetrics = [
    { name: 'Всего активных игроков', value: '148', icon: Users, color: 'text-blue-400' },
    { name: 'Проведено турниров (Месяц)', value: '24', icon: Trophy, color: 'text-amber-400' },
    { name: 'Общий призовой фонд', value: '1,450,000 ₽', icon: DollarSign, color: 'text-emerald-400' },
    { name: 'Средний прирост игроков', value: '+14%', icon: TrendingUp, color: 'text-purple-400' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Аналитика Клуба</h1>
            <p className="text-xs text-muted-foreground">Статистика посещаемости, призовых фондов и динаки игр</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {defaultMetrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{m.name}</span>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <p className="text-2xl font-extrabold text-foreground">{m.value}</p>
              </div>
            );
          })}
        </div>

        {analytics.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-foreground">Дополнительные Метрики Из Таблицы</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.map((item) => (
                <div key={item.id} className="p-4 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground">{item.metricName}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{String(item.metricValue)}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">Период: {item.period || 'Сезон'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
