'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  SeasonalTournamentRow, DailyGameDateRow, DailyGameRow, PlayerRow, formatRussianDate
} from '@/types';
import { Calendar, Trophy, Clock, PlusCircle, Trash2, Users, X, DollarSign, Award, ExternalLink, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';

function generateCalendarLink(startDateVal: string | Date, endDateVal: string | Date, title: string): string {
  const formatDate = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00Z`;
  };

  const startD = new Date(startDateVal);
  const endD = new Date(endDateVal);

  if (isNaN(startD.getTime())) return '#';
  const validEndD = isNaN(endD.getTime()) ? new Date(startD.getTime() + 3600000 * 3) : endD;

  const start = formatDate(startD);
  const end = formatDate(validEndD);
  const eventTitle = encodeURIComponent(title || 'Турнир ПК БАЗА');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}`;
}

export default function TournamentsPage() {
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [seasonalTournaments, setSeasonalTournaments] = useState<SeasonalTournamentRow[]>([]);
  const [dailyGameDates, setDailyGameDates] = useState<DailyGameDateRow[]>([]);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);

  // View Mode State
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

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

  // Active current seasonal tournament based on date and non-finished status
  const now = new Date();
  const currentTournament = seasonalTournaments.find((t) => {
    const startDate = new Date(t['Дата начала']);
    const endDate = t['Дата окончания'] ? new Date(t['Дата окончания']) : now;
    const isFinished = String(t['Завершить турнир'] || '').toLowerCase() === 'true' || t['Завершить турнир'] === 'Да' || t['Завершено'] === 'Да';
    return startDate <= now && endDate >= now && !isFinished;
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

  // Calendar Helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Adjust starting day (0 = Sunday, so shift to Monday = 0)
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

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
              <p className="text-xs text-muted-foreground">Календарь встреч, кубки и игроки за столами ПК "БАЗА"</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle Switch */}
            <div className="flex bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
                  viewMode === 'calendar'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Календарь</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
                  viewMode === 'grid'
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Сетка</span>
              </button>
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
        </div>

        {/* Calendar View (Month) */}
        {viewMode === 'calendar' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                <span>Календарь Игр ({monthNames[month]} {year})</span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
              {daysOfWeek.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 bg-muted/20 rounded-lg"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

                const gamesOnDate = dailyGameDates.filter((g) => {
                  if (!g['Дата']) return false;
                  return g['Дата'].startsWith(dateStr);
                });

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`h-16 p-1 bg-muted/40 border border-border/60 rounded-lg flex flex-col justify-between transition ${
                      gamesOnDate.length > 0 ? 'bg-brand/10 border-brand/40 cursor-pointer hover:bg-brand/20' : ''
                    }`}
                    onClick={() => {
                      if (gamesOnDate.length > 0) setSelectedGameDate(gamesOnDate[0]);
                    }}
                  >
                    <span className="text-xs font-bold text-foreground text-left">{dayNum}</span>
                    {gamesOnDate.length > 0 && (
                      <div className="bg-brand text-white text-[9px] font-bold px-1 py-0.5 rounded truncate">
                        {gamesOnDate[0]['Название'] || 'Турнир'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    Старт: {formatRussianDate(currentTournament['Дата начала'])}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={generateCalendarLink(
                    currentTournament['Дата начала'],
                    currentTournament['Дата окончания'] || new Date(new Date(currentTournament['Дата начала']).getTime() + 86400000 * 30),
                    currentTournament['Название'] || 'Сезонный турнир ПК БАЗА'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Добавить в календарь</span>
                </a>

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
          </div>
        )}

        {/* Daily Games Section (Grid View) */}
        {viewMode === 'grid' && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-brand" />
              <h3 className="text-xl font-bold text-foreground">Сетка Ежедневных Игр</h3>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dailyGameDates.map((game, idx) => {
                  const gamePlayers = dailyGames.filter((g) => g['Дата'] === game['Дата']);
                  const totalPlayers = game['Всего игроков'] || gamePlayers.length;
                  const pool = game['Банк рейтинга'] || '0';
                  const weight = game['Вес турнира'] || '1.0';

                  return (
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
                          {formatRussianDate(game['Дата'])}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <h4 className="font-bold text-foreground text-base leading-tight">{game['Название'] || 'Ежедневная Игра'}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{game['Описание']}</p>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl text-[11px] border border-border/50 text-center font-semibold">
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Игроков</span>
                            <span className="text-foreground">{totalPlayers}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Банк</span>
                            <span className="text-emerald-400">{pool} ₽</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Вес</span>
                            <span className="text-amber-400">x{weight}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t border-border/50 mt-2 flex items-center justify-between text-xs text-brand font-bold">
                        <span>Подробнее и список игроков</span>
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Daily Game Detail Modal with Table of Players */}
        {selectedGameDate && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedGameDate(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedGameDate['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                    alt={selectedGameDate['Название']}
                    className="w-24 h-24 rounded-xl object-cover shrink-0 border border-brand"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-brand">{formatRussianDate(selectedGameDate['Дата'])}</span>
                    <h3 className="text-xl font-bold text-foreground">{selectedGameDate['Название']}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{selectedGameDate['Описание']}</p>
                  </div>
                </div>

                <a
                  href={generateCalendarLink(
                    selectedGameDate['Дата'],
                    new Date(new Date(selectedGameDate['Дата']).getTime() + 3600000 * 4),
                    selectedGameDate['Название'] || 'Турнир ПК БАЗА'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition shrink-0 min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Добавить в календарь</span>
                </a>
              </div>

              {/* Tournament Summary Bar */}
              <div className="grid grid-cols-3 gap-3 bg-muted p-3 rounded-xl text-xs font-bold border border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand" />
                  <span>Всего игроков: <strong className="text-foreground">{selectedGameDate['Всего игроков'] || playersForSelectedGame.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Банк рейтинга: <strong className="text-emerald-400">{selectedGameDate['Банк рейтинга'] || 0} ₽</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Вес турнира: <strong className="text-amber-400">x{selectedGameDate['Вес турнира'] || 1.0}</strong></span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <h4 className="font-bold text-sm text-foreground">Зарегистрированные Игроки</h4>

                {playersForSelectedGame.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">На эту дату пока нет зарегистрированных игроков.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="p-2.5">Ник</th>
                          <th className="p-2.5">Дата</th>
                          <th className="p-2.5">Место</th>
                          <th className="p-2.5">Начислено</th>
                          <th className="p-2.5">Стоимость</th>
                          <th className="p-2.5">Телефон</th>
                          <th className="p-2.5">Почта</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {playersForSelectedGame.map((p, pIdx) => (
                          <tr key={pIdx} className="hover:bg-muted/30">
                            <td className="p-2.5 font-bold text-foreground">{p['Ник']}</td>
                            <td className="p-2.5 text-muted-foreground">{formatRussianDate(p['Дата'])}</td>
                            <td className="p-2.5 font-bold text-amber-400">#{p['Место'] || '-'}</td>
                            <td className="p-2.5 text-emerald-400 font-semibold">{p['Начислено'] || 0}</td>
                            <td className="p-2.5 text-foreground">{p['Стоимость'] ? `${p['Стоимость']} ₽` : '-'}</td>
                            <td className="p-2.5 text-muted-foreground">{p['Номер телефона'] || '-'}</td>
                            <td className="p-2.5 text-muted-foreground">{p['Почта'] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
