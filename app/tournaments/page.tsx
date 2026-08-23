'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { SeasonalTournamentRow } from '@/types';
import { Calendar, Trophy, CalendarPlus, Clock } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<SeasonalTournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch('/api/sheets?sheet=СЕЗОННЫЕ ТУРНИРЫ');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const now = new Date();
          const filtered = json.data.filter((t: SeasonalTournamentRow) => {
            if (!t['Дата окончания']) return true;
            return new Date(t['Дата окончания']) > now || t['Статус'] === 'Активен';
          });
          setTournaments(filtered.length > 0 ? filtered : json.data);
        }
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Calendar className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Турнирный Календарь</h1>
            <p className="text-xs text-muted-foreground">Ближайшие турниры и сезонные события клуба</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((t, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 shadow-md hover:border-brand transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand/20 text-brand-light border border-brand/30">
                      {t['Статус'] || 'Активен'}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {t['Дата начала'] ? new Date(t['Дата начала']).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Дата уточняется'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground">{t['Название']}</h3>
                  {t['Описание'] && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t['Описание']}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-emerald-400 font-extrabold text-lg">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Взнос: {t['Взнос'] ? Number(t['Взнос']).toLocaleString() : 0} ₽</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Предоплата: {t['Предоплата?'] || 'Нет'}</span>
                  <a
                    href={`https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(t['Название'] || 'Турнир БАЗА')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-light transition-colors min-h-[44px]"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    <span>Добавить в календарь</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
