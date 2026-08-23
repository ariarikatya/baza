'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Player, RatingPeriod } from '@/types';
import { Trophy, Filter } from 'lucide-react';

export default function RatingPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [period, setPeriod] = useState<RatingPeriod>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRating() {
      try {
        const res = await fetch('/api/sheets?sheet=ИГРОКИ');
        const json = await res.json();
        if (json.data) {
          // Sort by rating descending
          const sorted = [...json.data].sort((a: Player, b: Player) => (b.rating || 0) - (a.rating || 0));
          setPlayers(sorted);
        }
      } catch (err) {
        console.error('Failed to load rating:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRating();
  }, [period]);

  const filterButtons: { label: string; value: RatingPeriod }[] = [
    { label: 'Сегодня', value: 'today' },
    { label: 'Месяц', value: 'month' },
    { label: 'Сезон', value: 'season' },
    { label: 'Год', value: 'year' },
    { label: 'Все время', value: 'all' },
  ];

  const columns = [
    {
      header: '#',
      accessor: (_: Player, idx?: number) => (
        <span className="font-extrabold text-foreground">{idx !== undefined ? idx + 1 : '-'}</span>
      ),
      className: 'w-12 text-center',
    },
    {
      header: 'Игрок',
      accessor: (p: Player) => (
        <div className="flex items-center gap-3">
          <img
            src={p.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
            alt={p.nickname}
            className="w-9 h-9 rounded-full object-cover border border-border"
          />
          <div>
            <span className="font-bold text-foreground block">{p.nickname}</span>
            <span className="text-xs text-muted-foreground">{p.fullName}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Статус',
      accessor: (p: Player) => <StatusBadge status={p.status} />,
    },
    {
      header: 'Рейтинг',
      accessor: (p: Player) => (
        <span className="font-extrabold text-brand-light text-base">{p.rating || 1000}</span>
      ),
    },
    {
      header: 'Игр',
      accessor: 'gamesPlayed' as keyof Player,
    },
    {
      header: 'Побед',
      accessor: 'winsCount' as keyof Player,
    },
    {
      header: 'Призовые',
      accessor: (p: Player) => `${(p.totalPrizes || 0).toLocaleString()} ₽`,
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
              <h1 className="text-2xl font-bold text-foreground">Рейтинг Игроков</h1>
              <p className="text-xs text-muted-foreground">Таблица лидеров покерного клуба "БАЗА"</p>
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
          columns={columns.map((c, i) =>
            i === 0
              ? {
                  ...c,
                  accessor: (row: Player) => {
                    const idx = players.indexOf(row);
                    return (
                      <span className={`font-bold ${idx === 0 ? 'text-amber-400 text-lg' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        #{idx + 1}
                      </span>
                    );
                  },
                }
              : c
          )}
          data={players}
          pageSize={15}
          searchableKey="nickname"
          searchPlaceholder="Поиск по никнейму..."
        />
      </div>
    </AppLayout>
  );
}
