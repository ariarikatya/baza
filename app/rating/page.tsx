'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { TournamentTableRow, DailyGameRow, formatRussianDate } from '@/types';
import { Trophy } from 'lucide-react';

export type RatingPeriodFilter = 'today' | 'month' | 'season' | 'year' | 'all';

export default function RatingPage() {
  const [allRows, setAllRows] = useState<TournamentTableRow[]>([]);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<TournamentTableRow[]>([]);
  const [period, setPeriod] = useState<RatingPeriodFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRatingData() {
      try {
        const [ttRes, gamesRes] = await Promise.all([
          fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
        ]);

        const ttData = await ttRes.json();
        const gamesData = await gamesRes.json();

        if (ttData.data && Array.isArray(ttData.data)) {
          setAllRows(ttData.data);
        }
        if (gamesData.data && Array.isArray(gamesData.data)) {
          setDailyGames(gamesData.data);
        }
      } catch (err) {
        console.error('Failed to load tournament table rating:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRatingData();
  }, []);

  // Filter rating rows according to period and 'Дата' from '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'
  useEffect(() => {
    if (period === 'all') {
      const sorted = [...allRows].sort(
        (a, b) => (Number(b['Общий рейтинг']) || 0) - (Number(a['Общий рейтинг']) || 0)
      );
      setFilteredRows(sorted);
      return;
    }

    const now = new Date();
    const activeNicks = new Set<string>();

    dailyGames.forEach((game) => {
      if (!game['Дата']) return;
      const gameDate = new Date(game['Дата']);
      if (isNaN(gameDate.getTime())) return;

      let match = false;
      if (period === 'today') {
        match = gameDate.toDateString() === now.toDateString();
      } else if (period === 'month') {
        match = gameDate.getMonth() === now.getMonth() && gameDate.getFullYear() === now.getFullYear();
      } else if (period === 'season') {
        // Season = last 90 days
        match = (now.getTime() - gameDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
      } else if (period === 'year') {
        match = gameDate.getFullYear() === now.getFullYear();
      }

      if (match && game['Ник']) {
        activeNicks.add(game['Ник'].trim().toLowerCase());
      }
    });

    const filtered = allRows.filter((row) =>
      activeNicks.has(row['Ник']?.trim().toLowerCase())
    );

    const sorted = [...filtered].sort(
      (a, b) => (Number(b['Общий рейтинг']) || 0) - (Number(a['Общий рейтинг']) || 0)
    );
    setFilteredRows(sorted);
  }, [period, allRows, dailyGames]);

  const filterButtons: { label: string; value: RatingPeriodFilter }[] = [
    { label: 'Сегодня', value: 'today' },
    { label: 'Месяц', value: 'month' },
    { label: 'Сезон', value: 'season' },
    { label: 'Год', value: 'year' },
    { label: 'Все время', value: 'all' },
  ];

  const columns = [
    {
      header: 'Игрок',
      accessor: (p: TournamentTableRow) => (
        <div>
          <span className="font-bold text-foreground block">{p['Ник']}</span>
          <span className="text-xs text-muted-foreground">{p['Имя']}</span>
        </div>
      ),
    },
    {
      header: 'Статус',
      accessor: (p: TournamentTableRow) => <StatusBadge status={p['Статус'] || 'ИГРОК'} />,
    },
    {
      header: 'Общий рейтинг',
      accessor: (p: TournamentTableRow) => (
        <span className="font-extrabold text-brand-light text-base">{p['Общий рейтинг'] || 0}</span>
      ),
    },
    {
      header: 'Баунти',
      accessor: (p: TournamentTableRow) => p['Баунти'] || 0,
    },
    {
      header: 'Спец.задания',
      accessor: (p: TournamentTableRow) => p['Спец.задания'] || '-',
    },
    {
      header: 'В клубе',
      accessor: (p: TournamentTableRow) => p['В клубе'] || 'Нет',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Текущий Рейтинг Игроков</h1>
              <p className="text-xs text-muted-foreground">Турнирная таблица ПК "БАЗА" с фильтром по датам сыгранных игр</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted p-1.5 rounded-xl border border-border w-full sm:w-auto">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setPeriod(btn.value)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[38px] ${
                  period === btn.value
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Table */}
        <DataTable
          columns={[
            {
              header: '#',
              accessor: (row: TournamentTableRow) => {
                const idx = filteredRows.indexOf(row);
                return (
                  <span className={`font-bold ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{idx + 1}
                  </span>
                );
              },
            },
            ...columns,
          ]}
          data={filteredRows}
          pageSize={15}
          searchPlaceholder="Поиск по никнейму..."
        />
      </div>
    </AppLayout>
  );
}
