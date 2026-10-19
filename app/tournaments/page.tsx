'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import {
  SeasonalTournamentRow, DailyGameDateRow, DailyGameRow, PlayerRow, formatRussianDate
} from '@/types';
import { canManageContent } from '@/lib/permissions';
import { FileUploader } from '@/components/FileUploader';
import { Calendar, Trophy, Clock, PlusCircle, Trash2, Users, X, DollarSign, Award, ExternalLink, ChevronLeft, ChevronRight, LayoutGrid, Edit, CheckCircle2 } from 'lucide-react';

function parseRussianDateTime(str: string | undefined | null): Date | null {
  if (!str) return null;
  const trimmed = String(str).trim();
  if (!trimmed) return null;

  const ruMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 0;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    const seconds = ruMatch[6] ? parseInt(ruMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
    // If it's already DD.MM.YYYY HH:mm:ss, strip seconds for UI consistency
    if (str.length >= 16) {
      return str.slice(0, 16);
    }
    return str;
  }
  const d = parseRussianDateTime(str) || new Date(str);
  if (!d || isNaN(d.getTime())) return str;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [gameFilterTab, setGameFilterTab] = useState<'ongoing' | 'finished'>('ongoing');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedGameDate, setSelectedGameDate] = useState<DailyGameDateRow | null>(null);

  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<DailyGameDateRow | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameDateTime, setGameDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [gameRegDeadline, setGameRegDeadline] = useState(new Date().toISOString().slice(0, 16));
  const [gameDesc, setGameDesc] = useState('');
  const [gameWhatWillBe, setGameWhatWillBe] = useState('');
  const [gameImage, setGameImage] = useState('');
  const [gameIsPaid, setGameIsPaid] = useState(true);
  const [gameCost, setGameCost] = useState('3000');
  const [gameNotify, setGameNotify] = useState(false);
  const [selectedSeasonalTournament, setSelectedSeasonalTournament] = useState('');
  const [gameSubmitting, setGameSubmitting] = useState(false);

  const [isAddTournamentOpen, setIsAddTournamentOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBuyIn, setNewBuyIn] = useState('5000');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDesc, setNewDesc] = useState('');
  
  const [registering, setRegistering] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch (e) { console.error(e); }
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
  const hasRole = Boolean(role && String(role).trim() !== '');
  const isAdminOrOwner = canManageContent(currentUser);

  const now = new Date();
  const currentTournament = seasonalTournaments.find((t) => {
    const startDate = new Date(t['Дата начала']);
    const endDate = t['Дата окончания'] ? new Date(t['Дата окончания']) : now;
    const isFinished = String(t['Завершить турнир'] || '').toLowerCase() === 'true' || t['Завершить турнир'] === 'Да' || t['Завершено'] === 'Да';
    return startDate <= now && endDate >= now && !isFinished;
  }) || seasonalTournaments[0];

  const handleCancelRegistration = async (game: DailyGameDateRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    const rawGameDate = game['Дата'] || game['Дата и Время'] || '';
    const formattedGameDate = formatDateForSheet(rawGameDate);

    setCancelling(formattedGameDate);

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'delete_where',
          criteria: {
            'Дата': formattedGameDate,
            'Ник': currentUser['Ник'],
          },
        }),
      });

      const data = await res.json();

      if (data.success && data.deletedCount !== 0) {
        setDailyGames((prev) =>
          prev.filter((g) => {
            const sameDate = formatDateForSheet(g['Дата'] || '') === formattedGameDate;
            const sameNick = g['Ник']?.trim().toLowerCase() === currentUser['Ник']?.trim().toLowerCase();
            return !(sameDate && sameNick);
          })
        );
        setDailyGameDates((prev) =>
          prev.map((gDate) => {
            const rawG = gDate['Дата'] || gDate['Дата и Время'] || '';
            if (formatDateForSheet(rawG) === formattedGameDate) {
              const currentVal = Number(gDate['Всего игроков']) || 0;
              return {
                ...gDate,
                'Всего игроков': Math.max(0, currentVal - 1),
              };
            }
            return gDate;
          })
        );
        if (selectedGameDate) {
          const selRaw = selectedGameDate['Дата'] || selectedGameDate['Дата и Время'] || '';
          if (formatDateForSheet(selRaw) === formattedGameDate) {
            setSelectedGameDate((prev) =>
              prev
                ? {
                    ...prev,
                    'Всего игроков': Math.max(0, (Number(prev['Всего игроков']) || 0) - 1),
                  }
                : null
            );
          }
        }
      } else {
        alert('Не удалось отменить запись, попробуйте ещё раз.');
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      alert('Ошибка при отмене записи.');
    } finally {
      setCancelling(null);
    }
  };

  const handlePlayerRegister = async (game: DailyGameDateRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    const rawGameDate = game['Дата'] || game['Дата и Время'] || '';
    const formattedGameDate = formatDateForSheet(rawGameDate);
    
    setRegistering(formattedGameDate);

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: {
            'Дата': formattedGameDate,
            'Ник': currentUser['Ник'],
            'Номер телефона игрока': currentUser['Номер телефона'] || '',
            'Почта игрока': currentUser['Email'] || `${currentUser['Ник']}@baza.ru`,
            'Стоимость': game['Стоимость'] || game['Банк рейтинга'] || 3000,
            'Статус': 'Ожидает',
            'Имя': currentUser['Имя'] || currentUser['Ник'],
            'Вышел?': false,
          },
        }),
      });

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'В КЛУБЕ',
          action: 'append',
          rowData: {
            'Дата': new Date().toISOString().split('T')[0],
            'Ник': currentUser['Ник'],
            'Время входа': new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            'Статус': 'Ожидает',
            'Имя': currentUser['Имя'] || currentUser['Ник'],
            'Email': currentUser['Email'] || `${currentUser['Ник']}@baza.ru`,
            'Подтвержден?': false,
            'Аватар': currentUser['Аватар'] || '',
          },
        }),
      });

      setDailyGames((prev) => [
        ...prev,
        {
          'Дата': formattedGameDate,
          'Ник': currentUser['Ник'],
          'Номер телефона игрока': currentUser['Номер телефона'] || '',
          'Почта игрока': currentUser['Email'] || `${currentUser['Ник']}@baza.ru`,
          'Стоимость': game['Стоимость'] || 3000,
          'Статус': 'Ожидает',
          'Имя': currentUser['Имя'] || currentUser['Ник'],
          'Вышел?': false,
        } as DailyGameRow,
      ]);

      setRegisterSuccess(formattedGameDate);
      setTimeout(() => setRegisterSuccess(null), 3000);
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setRegistering(null);
    }
  };

  const handleSaveDailyGame = async (e: React.FormEvent) => {
    e.preventDefault();

    const description = gameDesc.trim() || gameWhatWillBe.trim();
    if (!gameDateTime || !description) {
      alert('Пожалуйста, заполните "Дата и Время" и "Описание"');
      return;
    }

    if (gameSubmitting) return;
    setGameSubmitting(true);

    const formattedDate = formatDateForSheet(gameDateTime);
    const formattedRegDeadline = formatDateForSheet(gameRegDeadline);

    const gameData: DailyGameDateRow = {
      'Сезонный турнир': selectedSeasonalTournament || currentTournament?.['Название'] || '',
      'Дата': formattedDate,
      'Дата и Время': formattedDate,
      'Дата окончания регистрации': formattedRegDeadline,
      'Название': `Игра ${formattedDate}`,
      'Изображение': gameImage || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
      'Описание': description,
      '"Что будет" описание': gameWhatWillBe.trim() || description,
      'Всего игроков': 0,
      'Банк рейтинга': gameIsPaid ? Number(gameCost) || 0 : 0,
      'Стоимость': gameIsPaid ? Number(gameCost) || 0 : 0,
      'Вес турнира': 1.0,
      'Платно?': gameIsPaid ? 'Да' : 'Нет',
      'Уведомления': gameNotify ? 'Да' : 'Нет',
      'Завершено?': editingGame ? gameCompleted : false,
    };

    try {
      if (editingGame) {
        const res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР',
            action: 'update',
            keyName: 'Дата',
            keyValue: editingGame['Дата'],
            rowData: gameData,
            userRole: currentUser?.['Роль'] || '',
            isAdmin: currentUser?.['Админ?'] === true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setDailyGameDates((prev) => prev.map((g) => (g['Дата'] === editingGame['Дата'] ? gameData : g)));
          setIsAddGameOpen(false);
        } else {
          alert('Ошибка при сохранении игры');
        }
      } else {
        const res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР',
            action: 'append',
            rowData: gameData,
            userRole: currentUser?.['Роль'] || '',
            isAdmin: currentUser?.['Админ?'] === true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setDailyGameDates((prev) => [...prev, gameData]);
          setIsAddGameOpen(false);
        } else {
          alert('Ошибка при добавлении игры');
        }
      }
    } catch (err) {
      console.error('Failed to save daily game:', err);
    } finally {
      setGameSubmitting(false);
    }
  };

  const handleDeleteDailyGame = async (dateVal: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Удалить игру на эту дату?')) return;

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Даты ежедневных игр',
          action: 'delete',
          keyName: 'Дата',
          keyValue: dateVal,
          userRole: currentUser?.['Роль'] || '',
          isAdmin: currentUser?.['Админ?'] === true,
        }),
      });
      const data = await res.json();
      if (data.success && data.deletedCount !== 0) {
        setDailyGameDates((prev) => prev.filter((g) => g['Дата'] !== dateVal && g['Дата и Время'] !== dateVal));
      } else {
        alert(data.error || 'Запись не найдена и не удалена');
      }
    } catch (err) {
      console.error('Failed to delete daily game:', err);
      alert('Ошибка при удалении игры');
    }
  };

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
          userRole: currentUser?.['Роль'] || '',
          isAdmin: currentUser?.['Админ?'] === true,
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

  const handleToggleGameCompletion = async (game: DailyGameDateRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const gameDateVal = game['Дата'] || game['Дата и Время'] || '';
    const isCurrentlyCompleted =
      game['Завершено?'] === true ||
      String(game['Завершено?']).toLowerCase() === 'true' ||
      game['Завершено?'] === '✓' ||
      game['Завершено?'] === '1';

    const newStatus = !isCurrentlyCompleted;

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР',
          action: 'update',
          keyName: 'Дата',
          keyValue: gameDateVal,
          rowData: { 'Завершено?': newStatus },
          userRole: currentUser?.['Роль'] || '',
          isAdmin: currentUser?.['Админ?'] === true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDailyGameDates((prev) =>
          prev.map((g) => {
            const gDate = g['Дата'] || g['Дата и Время'] || '';
            if (gDate === gameDateVal) {
              return { ...g, 'Завершено?': newStatus };
            }
            return g;
          })
        );
        if (selectedGameDate) {
          const selDate = selectedGameDate['Дата'] || selectedGameDate['Дата и Время'] || '';
          if (selDate === gameDateVal) {
            setSelectedGameDate((prev) => prev ? { ...prev, 'Завершено?': newStatus } : null);
          }
        }
      } else {
        alert(data.error || 'Ошибка при обновлении статуса игры');
      }
    } catch (err) {
      console.error('Failed to toggle game completion:', err);
      alert('Ошибка при обновлении статуса игры');
    }
  };

  const handleToggleTournamentCompletion = async (tournament: SeasonalTournamentRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const title = tournament['Название'];
    const isCurrentlyFinished =
      String(tournament['Завершить турнир'] || '').toLowerCase() === 'true' ||
      tournament['Завершить турнир'] === 'Да' ||
      tournament['Завершено'] === 'Да';

    const newStatus = isCurrentlyFinished ? 'Нет' : 'Да';

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'update',
          keyName: 'Название',
          keyValue: title,
          rowData: { 'Завершить турнир': newStatus },
          userRole: currentUser?.['Роль'] || '',
          isAdmin: currentUser?.['Админ?'] === true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSeasonalTournaments((prev) =>
          prev.map((t) => {
            if (t['Название'] === title) {
              return { ...t, 'Завершить турнир': newStatus };
            }
            return t;
          })
        );
      } else {
        alert(data.error || 'Ошибка при обновлении статуса турнира');
      }
    } catch (err) {
      console.error('Failed to toggle tournament completion:', err);
      alert('Ошибка при обновлении статуса турнира');
    }
  };

  const handleDeleteTournament = async (title: string) => {
    if (!confirm(`Удалить сезонный турнир "${title}"?`)) return;
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'delete',
          keyName: 'Название',
          keyValue: title,
          userRole: currentUser?.['Роль'] || '',
          isAdmin: currentUser?.['Админ?'] === true,
        }),
      });
      const data = await res.json();
      if (data.success && data.deletedCount !== 0) {
        setSeasonalTournaments((prev) => prev.filter((t) => t['Название'] !== title));
      } else {
        alert(data.error || 'Запись не найдена и не удалена');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении сезонного турнира');
    }
  };

  const playersForSelectedGame = selectedGameDate
    ? dailyGames.filter((g) => {
        const gDate = formatDateForSheet(g['Дата'] || '');
        const sDate = formatDateForSheet(selectedGameDate['Дата'] || selectedGameDate['Дата и Время'] || '');
        return gDate === sDate;
      })
    : [];

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay < 0) startingDay = 6;

  const prevMonth = () => setCurrentCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentCalendarDate(new Date(year, month + 1, 1));

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
              <p className="text-xs text-muted-foreground">Календарь встреч, кубки и игроки за столами ПК &quot;БАЗА&quot;</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${viewMode === 'calendar' ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Calendar className="w-4 h-4" />
                <span>Календарь</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${viewMode === 'grid' ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Сетка</span>
              </button>
            </div>

            {isAdminOrOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingGame(null);
                    setGameCompleted(false);
                    setGameDateTime(new Date().toISOString().slice(0, 16));
                    setGameRegDeadline(new Date().toISOString().slice(0, 16));
                    setGameDesc('');
                    setGameWhatWillBe('');
                    setGameImage('');
                    setGameCost('3000');
                    setSelectedSeasonalTournament(currentTournament?.['Название'] || (seasonalTournaments[0]?.['Название'] || ''));
                    setIsAddGameOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-sm transition min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Добавить игру</span>
                </button>

                <button
                  onClick={() => setIsAddTournamentOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl shadow-lg text-sm transition min-h-[44px]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Добавить турнир</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'calendar' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-brand" />
                <span>Календарь Игр ({monthNames[month]} {year})</span>
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition min-h-[38px] min-w-[38px] flex items-center justify-center">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition min-h-[38px] min-w-[38px] flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-muted-foreground border-b border-border pb-2">
              {daysOfWeek.map((day) => <div key={day}>{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startingDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 bg-muted/20 rounded-lg"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDayStr = `${String(dayNum).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;

                const gamesOnDate = dailyGameDates.filter((g) => {
                  const rawDate = g['Дата'] || g['Дата и Время'] || '';
                  const formattedSheetDate = formatDateForSheet(rawDate);
                  return formattedSheetDate.startsWith(formattedDayStr);
                });

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`h-16 p-1 bg-muted/40 border border-border/60 rounded-lg flex flex-col justify-between transition ${gamesOnDate.length > 0 ? 'bg-brand/10 border-brand/40 cursor-pointer hover:bg-brand/20' : ''}`}
                    onClick={() => { if (gamesOnDate.length > 0) setSelectedGameDate(gamesOnDate[0]); }}
                  >
                    <span className="text-xs font-bold text-foreground text-left">{dayNum}</span>
                    {gamesOnDate.length > 0 && (
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {gamesOnDate.map((g, gIdx) => (
                          <div
                            key={gIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGameDate(g);
                            }}
                            className="bg-brand hover:bg-brand-light text-white text-[9px] font-bold px-1 py-0.5 rounded truncate transition"
                          >
                            {(() => {
                              const dtStr = g['Дата и Время'] || g['Дата'] || '';
                              const timeMatch = dtStr.match(/\b(\d{2}:\d{2})\b/);
                              const timePart = timeMatch ? timeMatch[1] : '';
                              return timePart ? `Игра в ${timePart}` : g['Название'] || 'Игра';
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                  href={generateCalendarLink(currentTournament['Дата начала'], currentTournament['Дата окончания'] || new Date(new Date(currentTournament['Дата начала']).getTime() + 86400000 * 30), currentTournament['Название'] || 'Сезонный турнир ПК БАЗА')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Добавить в календарь</span>
                </a>

                {isAdminOrOwner && (
                  <>
                    <button
                      onClick={(e) => handleToggleTournamentCompletion(currentTournament, e)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 min-h-[44px] transition ${
                        String(currentTournament['Завершить турнир'] || '').toLowerCase() === 'true' || currentTournament['Завершить турнир'] === 'Да'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      }`}
                      title={
                        String(currentTournament['Завершить турнир'] || '').toLowerCase() === 'true' || currentTournament['Завершить турнир'] === 'Да'
                          ? 'Вернуть в активные'
                          : 'Завершить турнир'
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {String(currentTournament['Завершить турнир'] || '').toLowerCase() === 'true' || currentTournament['Завершить турнир'] === 'Да'
                          ? 'Вернуть в активные'
                          : 'Завершить турнир'}
                      </span>
                    </button>
                    <button onClick={() => handleDeleteTournament(currentTournament['Название'])} className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 min-h-[44px]">
                      <Trash2 className="w-4 h-4" />
                      <span>Удалить турнир</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'grid' && (() => {
          const renderGameCard = (game: DailyGameDateRow, idx: number) => {
            const gameDateStr = game['Дата и Время'] || game['Дата'] || '';
            const parsedGameStartTime = parseRussianDateTime(gameDateStr);
            const isGameStarted = parsedGameStartTime ? parsedGameStartTime <= now : false;

            const isCompleted = 
              game['Завершено?'] === true || 
              String(game['Завершено?']).toLowerCase() === 'true' || 
              game['Завершено?'] === '✓' || 
              game['Завершено?'] === '1';

            const gamePlayers = dailyGames.filter((g) => formatDateForSheet(g['Дата'] || '') === formatDateForSheet(gameDateStr));
            const totalPlayers = game['Всего игроков'] || gamePlayers.length;
            const pool = game['Банк рейтинга'] || '0';
            const weight = game['Вес турнира'] || '1.0';

            const regDeadlineStr = (game as any)['Дата окончания регистрации'];
            const parsedRegDeadline = regDeadlineStr ? parseRussianDateTime(regDeadlineStr) : parsedGameStartTime;

            const isUserRegistered = currentUser && dailyGames.some(
              (g) => formatDateForSheet(g['Дата'] || '') === formatDateForSheet(gameDateStr) &&
              g['Ник']?.trim().toLowerCase() === currentUser['Ник']?.trim().toLowerCase()
            );

            const isRegDeadlinePassed = parsedRegDeadline ? now >= parsedRegDeadline : false;
            const canRegister = !isCompleted && (isAdminOrOwner || (!isGameStarted && !isRegDeadlinePassed));

            return (
              <div
                onClick={() => setSelectedGameDate(game)}
                className={`bg-card border border-border hover:border-brand rounded-2xl overflow-hidden shadow-md cursor-pointer transition flex flex-col justify-between relative group ${isCompleted ? 'opacity-70' : ''}`}
              >
                <div className="relative h-40 bg-slate-800">
                  <img
                    src={game['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                    alt={formatRussianDate(gameDateStr)}
                    className="w-full h-full object-contain bg-slate-800 rounded-t-lg"
                  />
                  <span className={`absolute top-3 left-3 text-white text-xs font-bold px-3 py-1 rounded-md shadow-md z-10 ${isCompleted ? 'bg-gray-600' : isGameStarted ? 'bg-amber-600' : 'bg-brand'}`}>
                    {isCompleted ? '✅ Завершено' : isGameStarted ? '🔴 Идет игра' : formatRussianDate(gameDateStr)}
                  </span>

                  {isAdminOrOwner && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-lg z-20" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleToggleGameCompletion(game, e)}
                        className={`p-2 rounded-md transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                          isCompleted ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                        title={isCompleted ? 'Вернуть в активные' : 'Завершить игру'}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGame(game);
                          setGameCompleted(Boolean(
                            game['Завершено?'] === true ||
                            String(game['Завершено?']).toLowerCase() === 'true' ||
                            game['Завершено?'] === '✓' ||
                            game['Завершено?'] === '1'
                          ));
                          setGameDateTime(game['Дата'] || '');
                          setGameRegDeadline((game as any)['Дата окончания регистрации'] || game['Дата'] || '');
                          setGameDesc(game['Описание'] || '');
                          setGameWhatWillBe(game['"Что будет" описание'] || '');
                          setGameImage(game['Изображение'] || '');
                          setGameCost(String(game['Стоимость'] || game['Банк рейтинга'] || 3000));
                          setSelectedSeasonalTournament(game['Сезонный турнир'] || game['Сезонные турниры'] || currentTournament?.['Название'] || '');
                          setIsAddGameOpen(true);
                        }}
                        className="p-2 text-white hover:text-brand transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Изменить"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDailyGame(gameDateStr, e)}
                        className="p-2 text-white hover:text-rose-400 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-3">
                  <div className="space-y-1">
                    {(game['Сезонный турнир'] || game['Сезонные турниры']) && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block">
                        {game['Сезонный турнир'] || game['Сезонные турниры']}
                      </span>
                    )}
                    <h4 className="font-bold text-foreground text-base leading-tight">{formatRussianDate(gameDateStr)}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{game['Описание'] || game['"Что будет" описание']}</p>

                  <div className={`grid ${hasRole ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-muted/40 p-2.5 rounded-xl text-[11px] border border-border/50 text-center font-semibold`}>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Игроков</span>
                      <span className="text-foreground">{totalPlayers}</span>
                    </div>
                    {hasRole && (
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Банк</span>
                        <span className="text-emerald-400">{pool} ₽</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Вес</span>
                      <span className="text-amber-400">x{weight}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    {isCompleted ? (
                      <button disabled className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[38px]">
                        Завершено
                      </button>
                    ) : (isUserRegistered || registerSuccess === formatDateForSheet(gameDateStr)) ? (
                      <button
                        disabled={cancelling === formatDateForSheet(gameDateStr)}
                        onClick={(e) => handleCancelRegistration(game, e)}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[38px] disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{cancelling === formatDateForSheet(gameDateStr) ? 'Отмена...' : 'Отменить запись'}</span>
                      </button>
                    ) : !canRegister ? (
                      <button disabled className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[38px]">
                        {isGameStarted ? 'Игра началась' : 'Регистрация закрыта'}
                      </button>
                    ) : currentUser ? (
                      <button
                        disabled={registering === formatDateForSheet(gameDateStr)}
                        onClick={(e) => handlePlayerRegister(game, e)}
                        className="px-4 py-2 bg-brand hover:bg-brand-light text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
                      >
                        {registering === formatDateForSheet(gameDateStr) ? 'Запись...' : 'Записаться'}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold">Войдите для записи</span>
                    )}

                    <span className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
                      Подробнее <Users className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          };

          const sortedGames = [...dailyGameDates].sort((a, b) => {
            const dateA = new Date(a['Дата'] || a['Дата и Время'] || '');
            const dateB = new Date(b['Дата'] || b['Дата и Время'] || '');
            return dateA.getTime() - dateB.getTime();
          });

          const filteredGames = sortedGames.filter((g) => {
            const isCompleted =
              g['Завершено?'] === true ||
              String(g['Завершено?']).toLowerCase() === 'true' ||
              g['Завершено?'] === '✓' ||
              g['Завершено?'] === '1';

            if (gameFilterTab === 'finished') {
              return isCompleted;
            }
            return !isCompleted;
          });

          return (
            <div className="space-y-8 pt-4">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-brand" />
                    <h3 className="text-xl font-bold text-foreground">Расписание игр</h3>
                  </div>

                  <div className="flex bg-muted p-1 rounded-xl border border-border">
                    <button
                      onClick={() => setGameFilterTab('ongoing')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
                        gameFilterTab === 'ongoing' ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Идут
                    </button>
                    <button
                      onClick={() => setGameFilterTab('finished')}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[38px] ${
                        gameFilterTab === 'finished' ? 'bg-brand text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Завершены
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>)}
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-card border border-border rounded-2xl p-6">
                    <p className="text-lg font-semibold">
                      {gameFilterTab === 'ongoing' ? 'Нет активных игр' : 'Нет завершенных игр'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGames.map((game, idx) => renderGameCard(game, idx))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {selectedGameDate && (() => {
          const selectedGameDateStr = selectedGameDate['Дата и Время'] || selectedGameDate['Дата'] || '';
          const parsedPopupStartTime = parseRussianDateTime(selectedGameDateStr);
          const isPopupGameStarted = parsedPopupStartTime ? parsedPopupStartTime <= now : false;
          const isPopupCompleted =
            selectedGameDate['Завершено?'] === true ||
            String(selectedGameDate['Завершено?']).toLowerCase() === 'true' ||
            selectedGameDate['Завершено?'] === '✓' ||
            selectedGameDate['Завершено?'] === '1';

          const popupRegDeadlineStr = (selectedGameDate as any)['Дата окончания регистрации'];
          const parsedPopupRegDeadline = popupRegDeadlineStr ? parseRussianDateTime(popupRegDeadlineStr) : parsedPopupStartTime;
          const isPopupRegDeadlinePassed = parsedPopupRegDeadline ? now >= parsedPopupRegDeadline : false;

          const isPopupUserRegistered = currentUser && dailyGames.some(
            (g) => formatDateForSheet(g['Дата'] || '') === formatDateForSheet(selectedGameDateStr) &&
            g['Ник']?.trim().toLowerCase() === currentUser['Ник']?.trim().toLowerCase()
          );

          const canPopupRegister = !isPopupCompleted && (isAdminOrOwner || (!isPopupGameStarted && !isPopupRegDeadlinePassed));

          return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button onClick={() => setSelectedGameDate(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={selectedGameDate['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'} alt="Game" className="w-24 h-24 rounded-xl object-cover shrink-0 border border-brand" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-brand">{formatRussianDate(selectedGameDate['Дата'] || selectedGameDate['Дата и Время'])}</span>
                      <h3 className="text-xl font-bold text-foreground">{selectedGameDate['Название'] || 'Ежедневная игра'}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{selectedGameDate['Описание'] || selectedGameDate['"Что будет" описание']}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={generateCalendarLink(selectedGameDate['Дата'], new Date(new Date(selectedGameDate['Дата']).getTime() + 3600000 * 4), selectedGameDate['Название'] || 'Турнир ПК БАЗА')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition min-h-[44px]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Календарь</span>
                    </a>

                    {isAdminOrOwner && (
                      <button
                        onClick={(e) => handleToggleGameCompletion(selectedGameDate, e)}
                        className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition min-h-[44px] ${
                          isPopupCompleted
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        }`}
                        title={isPopupCompleted ? 'Вернуть в активные' : 'Завершить игру'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isPopupCompleted ? 'Вернуть в активные' : 'Завершить игру'}</span>
                      </button>
                    )}

                    {/* Registration button inside popup */}
                    {isPopupCompleted ? (
                      <button disabled className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[44px]">
                        Завершено
                      </button>
                    ) : (isPopupUserRegistered || registerSuccess === formatDateForSheet(selectedGameDateStr)) ? (
                      <button
                        disabled={cancelling === formatDateForSheet(selectedGameDateStr)}
                        onClick={(e) => handleCancelRegistration(selectedGameDate, e)}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{cancelling === formatDateForSheet(selectedGameDateStr) ? 'Отмена...' : 'Отменить запись'}</span>
                      </button>
                    ) : !canPopupRegister ? (
                      <button disabled className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[44px]">
                        {isPopupGameStarted ? 'Игра началась' : 'Регистрация закрыта'}
                      </button>
                    ) : currentUser ? (
                      <button
                        disabled={registering === formatDateForSheet(selectedGameDateStr)}
                        onClick={(e) => handlePlayerRegister(selectedGameDate, e)}
                        className="px-4 py-2 bg-brand hover:bg-brand-light text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {registering === formatDateForSheet(selectedGameDateStr) ? 'Запись...' : 'Записаться'}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold">Войдите для записи</span>
                    )}
                  </div>
                </div>

                <div className={`grid ${hasRole ? 'grid-cols-3' : 'grid-cols-2'} gap-3 bg-muted p-3 rounded-xl text-xs font-bold border border-border`}>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand" />
                    <span>Всего игроков: <strong className="text-foreground">{selectedGameDate['Всего игроков'] || playersForSelectedGame.length}</strong></span>
                  </div>
                  {hasRole && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Банк рейтинга: <strong className="text-emerald-400">{selectedGameDate['Банк рейтинга'] || 0} ₽</strong></span>
                    </div>
                  )}
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
                            {hasRole && <th className="p-2.5">Начислено</th>}
                            {hasRole && <th className="p-2.5">Стоимость</th>}
                            {hasRole && <th className="p-2.5">Телефон</th>}
                            {hasRole && <th className="p-2.5">Почта</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {playersForSelectedGame.map((p, pIdx) => (
                            <tr key={pIdx} className="hover:bg-muted/30">
                              <td className="p-2.5 font-bold text-foreground">{p['Ник']}</td>
                              <td className="p-2.5 text-muted-foreground">{formatRussianDate(p['Дата'])}</td>
                              <td className="p-2.5 font-bold text-amber-400">#{p['Место'] || '-'}</td>
                              {hasRole && <td className="p-2.5 text-emerald-400 font-semibold">{p['Начислено'] || 0}</td>}
                              {hasRole && <td className="p-2.5 text-foreground">{p['Стоимость'] ? `${p['Стоимость']} ₽` : '-'}</td>}
                              {hasRole && <td className="p-2.5 text-muted-foreground">{(p as any)['Номер телефона игрока'] || (p as any)['Номер телефона'] || '-'}</td>}
                              {hasRole && <td className="p-2.5 text-muted-foreground">{(p as any)['Почта игрока'] || (p as any)['Почта'] || (p as any)['Email'] || '-'}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {isAddGameOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setIsAddGameOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground">{editingGame ? 'Изменить Ежедневную Игру' : 'Добавить Ежедневную Игру'}</h3>

              <form onSubmit={handleSaveDailyGame} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Сезонный турнир</label>
                  <select
                    value={selectedSeasonalTournament}
                    onChange={(e) => setSelectedSeasonalTournament(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground min-h-[44px]"
                  >
                    {seasonalTournaments.map((st, idx) => (
                      <option key={idx} value={st['Название']}>
                        {st['Название']}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Дата и Время *</label>
                    <input
                      type="datetime-local"
                      required
                      value={gameDateTime}
                      onChange={(e) => setGameDateTime(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Конец регистрации</label>
                    <input
                      type="datetime-local"
                      value={gameRegDeadline}
                      onChange={(e) => setGameRegDeadline(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                  <textarea value={gameDesc} onChange={(e) => setGameDesc(e.target.value)} placeholder="Описание игры..." className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground h-16 resize-none" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">&quot;Что будет&quot; описание</label>
                  <textarea value={gameWhatWillBe} onChange={(e) => setGameWhatWillBe(e.target.value)} placeholder="Что будет на игре..." className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground h-16 resize-none" />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input type="checkbox" checked={gameIsPaid} onChange={(e) => setGameIsPaid(e.target.checked)} className="w-4 h-4 text-brand rounded" />
                    <span>Платно?</span>
                  </label>
                  {gameIsPaid && (
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-muted-foreground">Стоимость (₽)</label>
                      <input type="number" value={gameCost} onChange={(e) => setGameCost(e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Изображение (загрузка ImgBB)</label>
                  <FileUploader onUploadComplete={(url) => setGameImage(url)} />
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="gameNotify" checked={gameNotify} onChange={(e) => setGameNotify(e.target.checked)} className="w-4 h-4 text-brand rounded" />
                  <label htmlFor="gameNotify" className="text-xs text-muted-foreground cursor-pointer">Отправить Telegram уведомления</label>
                </div>

                {editingGame && hasRole && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <input
                      type="checkbox"
                      id="gameCompleted"
                      checked={gameCompleted}
                      onChange={(e) => setGameCompleted(e.target.checked)}
                      className="w-4 h-4 text-brand rounded cursor-pointer"
                    />
                    <label htmlFor="gameCompleted" className="text-xs text-foreground font-bold cursor-pointer">
                      Завершить игру (пометить как завершённую)
                    </label>
                  </div>
                )}

                <button type="submit" disabled={gameSubmitting} className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px] shadow-lg shadow-brand/20 disabled:opacity-50">
                  {gameSubmitting ? 'Сохранение...' : editingGame ? 'Сохранить изменения' : 'Добавить игру'}
                </button>
              </form>
            </div>
          </div>
        )}

        {isAddTournamentOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button onClick={() => setIsAddTournamentOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-foreground">Добавить Сезонный Турнир</h3>

              <form onSubmit={handleAddTournament} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Название Турнира *</label>
                  <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Зимний Кубок 2024" className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Взнос (₽)</label>
                  <input type="number" value={newBuyIn} onChange={(e) => setNewBuyIn(e.target.value)} className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Дата Начала</label>
                  <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Описание призового фонда и регламента..." className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand h-24 resize-none" />
                </div>

                <button type="submit" className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px]">Создать турнир</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
