'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { TournamentTableRow } from '@/types';
import { Trophy } from 'lucide-react';

export type RatingPeriodFilter = 'today' | 'month' | 'season' | 'year' | 'all';

export default function RatingPage() {
  const [rows, setRows] = useState<TournamentTableRow[]>([]);
  const [period, setPeriod] = useState<RatingPeriodFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRating() {
      try {
        const res = await fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          // Sort by 'Общий рейтинг' descending
          const sorted = [...json.data].sort(
            (a: TournamentTableRow, b: TournamentTableRow) =>
              (Number(b['Общий рейтинг']) || 0) - (Number(a['Общий рейтинг']) || 0)
          );
          setRows(sorted);
        }
      } catch (err) {
        console.error('Failed to load tournament table rating:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRating();
  }, [period]);

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
              <h1 className="text-2xl font-bold text-foreground">Турнирная Таблица (Рейтинг)</h1>
              <p className="text-xs text-muted-foreground">Очки, баунти и спецзадания игроков ПК "БАЗА"</p>
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
                const idx = rows.indexOf(row);
                return (
                  <span className={`font-bold ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{row['Место'] || idx + 1}
                  </span>
                );
              },
            },
            ...columns,
          ]}
          data={rows}
          pageSize={15}
          searchPlaceholder="Поиск по никнейму..."
        />
      </div>
    </AppLayout>
  );
}
