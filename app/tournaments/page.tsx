'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  SeasonalTournamentRow, DailyGameDateRow, DailyGameRow, PlayerRow
} from '@/types';
import { Calendar, Trophy, CalendarPlus, Clock, PlusCircle, Trash2, Users, X } from 'lucide-react';

export default function TournamentsPage() {
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [seasonalTournaments, setSeasonalTournaments] = useState<SeasonalTournamentRow[]>([]);
  const [dailyGameDates, setDailyGameDates] = useState<DailyGameDateRow[]>([]);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);

  // Selected daily game modal
  const [selectedGameDate, setSelectedGameDate] = useState<DailyGameDateRow | null>(null);

  // Admin add tournament modal
  const [isAddTournamentOpen, setIsAddTournamentOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBuyIn, setNewBuyIn] = useState('5000');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }

    async function fetchTournamentsData() {
      try {
        const [seasonalRes, datesRes, gamesRes] = await Promise.all([
          fetch('/api/sheets?sheet=СЕЗОННЫЕ ТУРНИРЫ'),
          fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
        ]);

        const seasonalData = await seasonalRes.json();
        const datesData = await datesRes.json();
        const gamesData = await gamesRes.json();

        if (seasonalData.data && Array.isArray(seasonalData.data)) setSeasonalTournaments(seasonalData.data);
        if (datesData.data && Array.isArray(datesData.data)) setDailyGameDates(datesData.data);
        if (gamesData.data && Array.isArray(gamesData.data)) setDailyGames(gamesData.data);
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTournamentsData();
  }, []);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;

  // Active current seasonal tournament based on date
  const now = new Date();
  const currentTournament = seasonalTournaments.find((t) => {
    if (!t['Дата окончания']) return true;
    return new Date(t['Дата окончания']) >= now || t['Статус'] === 'Активен';
  }) || seasonalTournaments[0];

  const handleAddTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const newTournament: SeasonalTournamentRow = {
        'Название': newTitle.trim(),
        'Взнос': newBuyIn,
        'Дата начала': newStartDate,
        'Дата окончания': new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        'Статус': 'Активен',
        'Описание': newDesc.trim() || 'Сезонный турнир ПК БАЗА',
        'Предоплата?': 'Да',
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'append',
          rowData: newTournament,
        }),
      });

      setSeasonalTournaments((prev) => [...prev, newTournament]);
      setIsAddTournamentOpen(false);
      setNewTitle('');
      setNewDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTournament = async (title: string) => {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'delete',
          keyValue: title,
        }),
      });

      setSeasonalTournaments((prev) => prev.filter((t) => t['Название'] !== title));
    } catch (err) {
      console.error(err);
    }
  };

  // Players for selected daily game
  const playersForSelectedGame = selectedGameDate
    ? dailyGames.filter((g) => g['Дата'] === selectedGameDate['Дата'])
    : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Турниры и Ежедневные Игры</h1>
              <p className="text-xs text-muted-foreground">Календарь встреч и активные кубки ПК "БАЗА"</p>
            </div>
          </div>

          {isAdminOrOwner && (
            <button
              onClick={() => setIsAddTournamentOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-sm transition min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Добавить турнир</span>
            </button>
          )}
        </div>

        {/* Current Active Seasonal Tournament Banner */}
        {currentTournament && (
          <div className="bg-gradient-to-r from-amber-500/20 via-card to-card border-2 border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
                  Текущий Сезонный Турнир
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">{currentTournament['Название']}</h2>
                <p className="text-xs text-muted-foreground max-w-2xl">{currentTournament['Описание']}</p>
                <div className="flex items-center gap-4 pt-2 text-sm font-bold text-emerald-400">
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Взнос: {currentTournament['Взнос'] ? Number(currentTournament['Взнос']).toLocaleString() : 0} ₽
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    Старт: {currentTournament['Дата начала'] || 'Уточняется'}
                  </span>
                </div>
              </div>

              {isAdminOrOwner && (
                <button
                  onClick={() => handleDeleteTournament(currentTournament['Название'])}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Удалить турнир</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Daily Games Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand" />
            <h3 className="text-xl font-bold text-foreground">Расписание Ежедневных Игр</h3>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dailyGameDates.map((game, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedGameDate(game)}
                  className="bg-card border border-border hover:border-brand rounded-2xl overflow-hidden shadow-md cursor-pointer transition flex flex-col justify-between"
                >
                  <div className="relative h-40 bg-muted">
                    <img
                      src={game['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={game['Название'] || 'Ежедневная игра'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-3 left-3 bg-brand text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
                      {game['Дата']}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h4 className="font-bold text-foreground text-base leading-tight">{game['Название'] || 'Ежедневная Игра'}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{game['Описание']}</p>
                  </div>

                  <div className="p-5 pt-0 border-t border-border/50 mt-2 flex items-center justify-between text-xs text-brand font-bold">
                    <span>Подробнее и список игроков</span>
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Game Detail Modal */}
        {selectedGameDate && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedGameDate(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative h-48 rounded-xl overflow-hidden bg-muted">
                <img
                  src={selectedGameDate['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                  alt={selectedGameDate['Название']}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <span className="text-xs font-bold text-brand">{selectedGameDate['Дата']}</span>
                <h3 className="text-xl font-bold text-foreground">{selectedGameDate['Название']}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedGameDate['Описание']}</p>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground">Зарегистрированные Игроки ({playersForSelectedGame.length})</h4>
                </div>

                {playersForSelectedGame.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">На эту дату пока нет зарегистрированных игроков.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {playersForSelectedGame.map((p, pIdx) => (
                      <div key={pIdx} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-xs">
                        <span className="font-bold text-foreground">{p['Ник']}</span>
                        <span className="text-muted-foreground">Рейтинг: {p['Рейтинг']} • {p['Статус']}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin Add Tournament Modal */}
        {isAddTournamentOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button
                onClick={() => setIsAddTournamentOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground">Добавить Сезонный Турнир</h3>

              <form onSubmit={handleAddTournament} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Название Турнира *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Зимний Кубок 2024"
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Взнос (₽)</label>
                  <input
                    type="number"
                    value={newBuyIn}
                    onChange={(e) => setNewBuyIn(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Дата Начала</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Описание призового фонда и регламента..."
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand h-24 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px]"
                >
                  Создать турнир
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
