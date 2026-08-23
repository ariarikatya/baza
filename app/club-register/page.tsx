'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { InClubRow } from '@/types';
import { Users, Search, CheckCircle, Clock } from 'lucide-react';

export default function ClubRegisterPage() {
  const [inClubPlayers, setInClubPlayers] = useState<InClubRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=В КЛУБЕ')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setInClubPlayers(json.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = inClubPlayers.filter(
    (p) =>
      p['Ник']?.toLowerCase().includes(search.toLowerCase()) ||
      p['Имя']?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Игроки В Клубе</h1>
            <p className="text-xs text-muted-foreground">Список игроков, находящихся в клубе и за столами</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по нику или имени..."
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            />
          </div>
          <span className="text-xs text-muted-foreground">Сейчас в клубе: {filtered.length} игроков</span>
        </div>

        {/* Players List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((player, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm hover:border-brand transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={player['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={player['Ник']}
                    className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-foreground text-sm truncate">{player['Ник']}</h3>
                      <StatusBadge status={player['Статус'] || 'В игре'} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{player['Имя']}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-brand" />
                    <span>Вход: {player['Время входа'] || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{player['Подтвержден?'] || 'Да'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
