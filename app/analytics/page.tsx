'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSavedUserSession, restoreUserSessionAsync } from '@/lib/session';
import { AppLayout } from '@/components/AppLayout';
import { AnalyticsRow, PlayerRow } from '@/types';
import { BarChart3, TrendingUp, Users, Trophy, DollarSign, Activity, Award, Wallet } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [calculatedTotalGames, setCalculatedTotalGames] = useState<number | null>(null);
  const [calculatedAvgRating, setCalculatedAvgRating] = useState<number | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      let u: PlayerRow | null = getSavedUserSession();
      if (!u) {
        u = await restoreUserSessionAsync();
      }
      if (!u) {
        router.push('/login');
        return;
      }
      setCurrentUser(u);
      const role = u['Роль'];
      const isAdmin = role === 'Админ' || role === 'Владелец' || u['Админ?'] === true;
      if (!isAdmin) {
        router.push('/home');
        return;
      }
    };
    checkUser();

    Promise.all([
      fetch('/api/sheets?sheet=АНАЛИТИКА'),
      fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
      fetch('/api/sheets?sheet=Игроки'),
    ])
      .then(async ([aRes, dRes, pRes]) => {
        const aJson = await aRes.json();
        const dJson = await dRes.json();
        const pJson = await pRes.json();

        if (aJson.data && Array.isArray(aJson.data)) setAnalytics(aJson.data);

        if (dJson.data && Array.isArray(dJson.data)) {
          const datesSet = new Set<string>();
          dJson.data.forEach((row: any) => {
            const rawDate = String(row['Дата и Время'] || row['Дата'] || '').trim();
            if (!rawDate) return;
            const match = rawDate.match(/^(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/);
            if (match) {
              datesSet.add(match[1]);
            } else if (rawDate.length >= 10) {
              datesSet.add(rawDate.slice(0, 16));
            }
          });
          setCalculatedTotalGames(datesSet.size);
        }

        if (pJson.data && Array.isArray(pJson.data)) {
          const activePlayers = pJson.data.filter((p: PlayerRow) => {
            const isBanned =
              p['Бан'] === true ||
              String(p['Бан'] || '').toLowerCase() === 'true' ||
              String(p['Бан'] || '') === '1';
            const ratingVal = p['Общий рейтинг'];
            const num = Number(String(ratingVal).replace(/\s+/g, '').replace(',', '.'));
            return !isBanned && !isNaN(num) && num > 0;
          });

          if (activePlayers.length > 0) {
            const sum = activePlayers.reduce((acc: number, p: PlayerRow) => {
              const num = Number(String(p['Общий рейтинг']).replace(/\s+/g, '').replace(',', '.'));
              return acc + num;
            }, 0);
            const avg = sum / activePlayers.length;
            setCalculatedAvgRating(Math.round(avg * 10) / 10);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [router]);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;
  if (!isAdminOrOwner) return null;

  const firstRow = analytics[0] || {};

  const formatMoney = (val: any) => {
    if (val === undefined || val === null || val === '') return '0 ₽';
    const num = Number(val) || 0;
    return `${num.toLocaleString('ru-RU')} ₽`;
  };

  const formatAvg = (val: any) => {
    if (val === undefined || val === null || val === '') return '0.00';
    const num = Number(val) || 0;
    return num.toFixed(2);
  };

  const totalGamesVal = calculatedTotalGames !== null
    ? String(calculatedTotalGames)
    : (firstRow['Всего Игр'] !== undefined ? String(firstRow['Всего Игр']) : '0');

  const avgRatingVal = calculatedAvgRating !== null
    ? calculatedAvgRating.toFixed(1)
    : formatAvg(firstRow['Средний рейтинг']);

  const metrics = [
    {
      title: 'Общий Банк Клуба',
      value: formatMoney(firstRow['Общий Банк Клуба']),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Всего Игр',
      value: totalGamesVal,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      title: 'Выплачено Баунти',
      value: formatMoney(firstRow['Выплачено Баунти']),
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Количество Золотых игроков',
      value: firstRow['Количество Золотых игроков'] !== undefined ? String(firstRow['Количество Золотых игроков']) : '0',
      icon: Award,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      title: 'Текущий Банк (за сегодня)',
      value: formatMoney(firstRow['Текущий Банк (за сегодня)']),
      icon: Wallet,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    {
      title: 'Всего игроков',
      value: firstRow['Всего игроков'] !== undefined ? String(firstRow['Всего игроков']) : '0',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Средний рейтинг',
      value: avgRatingVal,
      icon: Activity,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      title: 'Самый активный',
      value: firstRow['Самый активный'] || '-',
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
