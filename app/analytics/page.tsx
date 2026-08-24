'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsRow, PlayerRow } from '@/types';
import { BarChart3, TrendingUp, Users, Trophy, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        const u: PlayerRow = JSON.parse(stored);
        setCurrentUser(u);
        const role = u['Роль'];
        const isAdmin = role === 'Админ' || role === 'Владелец' || u['Админ?'] === true;
        if (!isAdmin) {
          router.push('/home');
          return;
        }
      } catch (e) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    fetch('/api/sheets?sheet=АНАЛИТИКА')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) setAnalytics(json.data);
      })
      .catch((err) => console.error(err));
  }, [router]);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;
  if (!isAdminOrOwner) return null;

  const firstRow = analytics[0] || {};

  const metrics = [
    {
      name: 'Общий Банк Клуба',
      value: firstRow['Общий Банк Клуба'] ? `${Number(firstRow['Общий Банк Клуба']).toLocaleString()} ₽` : '1,450,000 ₽',
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      name: 'Всего Игр',
      value: firstRow['Всего Игр'] || '150',
      icon: Trophy,
      color: 'text-amber-400',
    },
    {
      name: 'Выплачено Баунти',
      value: firstRow['Выплачено Баунти'] ? `${Number(firstRow['Выплачено Баунти']).toLocaleString()} ₽` : '320,000 ₽',
      icon: TrendingUp,
      color: 'text-purple-400',
    },
    {
      name: 'Количество Золотых игроков',
      value: firstRow['Количество Золотых игроков'] || '8',
      icon: Users,
      color: 'text-blue-400',
    },
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
            <p className="text-xs text-muted-foreground">Статистика посещаемости, призовых фондов и динамики игр</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => {
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
            <h3 className="text-lg font-bold text-foreground">Все Метрики Из Таблицы Аналитики</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analytics[0] || {}).map(([key, value], idx) => (
                <div key={idx} className="p-4 bg-muted/40 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{String(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
