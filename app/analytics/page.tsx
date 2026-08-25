'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsRow, PlayerRow } from '@/types';
import { BarChart3, TrendingUp, Users, Trophy, DollarSign, Activity, Award, Wallet } from 'lucide-react';

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
      title: 'Общий Банк Клуба',
      value: firstRow['Общий Банк Клуба'] ? `${Number(firstRow['Общий Банк Клуба']).toLocaleString()} ₽` : '1,450,000 ₽',
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Всего Игр',
      value: firstRow['Всего Игр'] || '150',
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Выплачено Баунти',
      value: firstRow['Выплачено Баунти'] ? `${Number(firstRow['Выплачено Баунти']).toLocaleString()} ₽` : '320,000 ₽',
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Количество Золотых игроков',
      value: firstRow['Количество Золотых игроков'] || '8',
      icon: Award,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Текущий Банк (за сегодня)',
      value: firstRow['Текущий Банк (за сегодня)'] ? `${Number(firstRow['Текущий Банк (за сегодня)']).toLocaleString()} ₽` : '75,000 ₽',
      icon: Wallet,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      title: 'Всего игроков',
      value: firstRow['Всего игроков'] || '148',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Средний рейтинг',
      value: firstRow['Средний рейтинг'] || '1150',
      icon: Activity,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      title: 'Самый активный',
      value: firstRow['Самый активный'] || 'PokerKing',
      icon: Users,
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
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
            <p className="text-xs text-muted-foreground">Статистика посещаемости, призовых фондов и финансовой динамики</p>
          </div>
        </div>

        {/* 8 Mapped Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 hover:border-brand transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{m.title}</span>
                  <div className={`p-2 rounded-xl ${m.bg}`}>
                    <Icon className={`w-5 h-5 ${m.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">{m.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
