'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { TournamentTableRow, DailyGameRow } from '@/types';
import { calculatePlayerRating } from '@/lib/calculations';
import { Trophy } from 'lucide-react';

export type RatingPeriodFilter = 'today' | 'month' | 'season' | 'year' | 'all';

interface RatedPlayerRow extends TournamentTableRow {
  displayRating: number | string;
  computedPlace?: number;
}

export default function RatingPage() {
  const [allRows, setAllRows] = useState<TournamentTableRow[]>([]);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredRows, setFilteredRows] = useState<RatedPlayerRow[]>([]);
  const [period, setPeriod] = useState<RatingPeriodFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRatingData() {
      try {
        const [ttRes, gamesRes, bountyRes, taskRes] = await Promise.all([
          fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
          fetch('/api/sheets?sheet=💰 БАУНТИ').catch(() => fetch('/api/sheets?sheet=БАУНТИ')).catch(() => null),
          fetch('/api/sheets?sheet=ЗАДАНИЯ').catch(() => fetch('/api/sheets?sheet=Задания')).catch(() => fetch('/api/sheets?sheet=СПЕЦ ЗАДАНИЯ')).catch(() => null),
        ]);

        const ttData = await ttRes.json();
        const gamesData = await gamesRes.json();
        const bountyData = bountyRes ? await bountyRes.json().catch(() => ({ data: [] })) : { data: [] };
        const taskData = taskRes ? await taskRes.json().catch(() => ({ data: [] })) : { data: [] };

        if (ttData.data && Array.isArray(ttData.data)) {
          setAllRows(ttData.data);
        }
        if (gamesData.data && Array.isArray(gamesData.data)) {
          setDailyGames(gamesData.data);
        }
        if (bountyData.data && Array.isArray(bountyData.data)) {
          setBounties(bountyData.data);
        }
        if (taskData.data && Array.isArray(taskData.data)) {
          setTasks(taskData.data);
        }
      } catch (err) {
        console.error('Failed to load rating data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRatingData();
  }, []);

  useEffect(() => {
    if (period === 'all') {
      // Filter out banned players
      const validRows = allRows.filter((row) => !row['Бан']);
      const sorted = [...validRows]
        .map((row) => ({
          ...row,
          displayRating: row['Общий рейтинг'] ?? 0,
        }))
        .sort((a, b) => {
          const placeA = Number(a['Место']) || 999;
          const placeB = Number(b['Место']) || 999;
          return placeA - placeB;
        });

      setFilteredRows(sorted);
    } else {
      const validRows = allRows.filter((row) => !row['Бан']);
      const computed = validRows.map((row) => {
        const nick = row['Ник'];
        const ratingForPeriod = calculatePlayerRating(nick, period, dailyGames, bounties, tasks);
        return {
          ...row,
          displayRating: ratingForPeriod,
        };
      });

      const sorted = computed.sort((a, b) => Number(b.displayRating) - Number(a.displayRating));
      setFilteredRows(sorted);
    }
  }, [period, allRows, dailyGames, bounties, tasks]);

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
      accessor: (p: RatedPlayerRow) => (
        <div>
          <span className="font-bold text-foreground block">{p['Ник']}</span>
          <span className="text-xs text-muted-foreground">{p['Имя']}</span>
        </div>
      ),
    },
    {
      header: 'Статус',
      accessor: (p: RatedPlayerRow) => {
        const placeNum = filteredRows.indexOf(p) + 1;

        let calculatedStatus = '👤 ИГРОК';
        if (placeNum === 1) calculatedStatus = '🏆 ЧЕМПИОН';
        else if (placeNum === 2) calculatedStatus = '🥈 ВИЦЕ-ЧЕМПИОН';
        else if (placeNum >= 3 && placeNum <= 10) calculatedStatus = '⭐ ЗОЛОТОЙ ИГРОК';

        return <StatusBadge status={calculatedStatus} />;
      },
    },
    {
      header: 'Общий рейтинг',
      accessor: (p: RatedPlayerRow) => (
        <span className="font-extrabold text-brand-light text-base">{p.displayRating}</span>
      ),
    },
    {
      header: 'Баунти',
      accessor: (p: RatedPlayerRow) => p['Баунти'] || 0,
    },
    {
      header: 'Спец.задания',
      accessor: (p: RatedPlayerRow) => p['Спец.задания'] || '-',
    },
    {
      header: 'В клубе',
      accessor: (p: RatedPlayerRow) => p['В клубе'] || 'Нет',
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
              <p className="text-xs text-muted-foreground">Турнирная таблица ПК "БАЗА" с перерасчетом по периодам</p>
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
              accessor: (row: RatedPlayerRow) => {
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
