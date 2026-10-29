'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DailyGameDateRow, DailyGameRow, PlayerRow, formatRussianDate } from '@/types';
import { parseRussianDateTime, formatDateForSheet, getFormattedGameTitle } from '@/components/GameCard';
import { X, ExternalLink, Trash2, Users, DollarSign, Award } from 'lucide-react';

export function generateCalendarLink(startDateVal: string | Date, endDateVal: string | Date, title: string): string {
  const formatDate = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00Z`;
  };
  const startD = typeof startDateVal === 'string' ? (parseRussianDateTime(startDateVal) || new Date(startDateVal)) : startDateVal;
  const endD = typeof endDateVal === 'string' ? (parseRussianDateTime(endDateVal) || new Date(endDateVal)) : endDateVal;

  if (!startD || isNaN(startD.getTime())) return '#';
  const validEndD = !endD || isNaN(endD.getTime()) ? new Date(startD.getTime() + 3600000 * 3) : endD;
  const start = formatDate(startD);
  const end = formatDate(validEndD);
  const eventTitle = encodeURIComponent(title || 'Турнир ПК БАЗА');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}`;
}

export interface GameDetailsModalProps {
  game: DailyGameDateRow | null;
  dailyGames: DailyGameRow[];
  currentUser: PlayerRow | null;
  isAdminOrOwner?: boolean;
  hasRole?: boolean;
  onClose: () => void;
  onRegisterSuccess?: (gameDateStr: string, newRegistration: DailyGameRow) => void;
  onCancelSuccess?: (gameDateStr: string, nick: string) => void;
}

export function GameDetailsModal({
  game,
  dailyGames,
  currentUser,
  isAdminOrOwner = false,
  hasRole = false,
  onClose,
  onRegisterSuccess,
  onCancelSuccess,
}: GameDetailsModalProps) {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!game) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game, onClose]);

  if (!game) return null;

  const rawGameDateStr = game['Дата и Время'] || game['Дата'] || '';
  const formattedSheetDate = formatDateForSheet(rawGameDateStr);
  const parsedStartTime = parseRussianDateTime(rawGameDateStr);
  const now = new Date();

  const isGameStarted = parsedStartTime ? parsedStartTime <= now : false;
  const isCompleted =
    game['Завершено?'] === true ||
    String(game['Завершено?']).toLowerCase() === 'true' ||
    game['Завершено?'] === '✓' ||
    game['Завершено?'] === '1';

  const regDeadlineStr = (game as any)['Дата окончания регистрации'];
  const parsedRegDeadline = regDeadlineStr ? parseRussianDateTime(regDeadlineStr) : parsedStartTime;
  const isRegDeadlinePassed = parsedRegDeadline ? now >= parsedRegDeadline : false;

  const currentNick = currentUser?.['Ник']?.trim().toLowerCase();

  const playersForGame = dailyGames.filter(
    (g) => formatDateForSheet(g['Дата'] || '') === formattedSheetDate
  );

  const isUserRegistered = Boolean(
    currentNick && playersForGame.some((g) => g['Ник']?.trim().toLowerCase() === currentNick)
  );

  const canRegister = !isCompleted && (isAdminOrOwner || (!isGameStarted && !isRegDeadlinePassed));

  const cost = game['Стоимость'] || game['Банк рейтинга'] || 0;
  const pool = game['Банк рейтинга'] || game['Стоимость'] || 0;
  const weight = game['Вес турнира'] || 1.0;
  const totalPlayers = game['Всего игроков'] !== undefined && game['Всего игроков'] !== ''
    ? Number(game['Всего игроков']) || playersForGame.length
    : playersForGame.length;

  const handleRegister = async () => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }

    if (registering) return;
    setRegistering(true);

    try {
      const newRegistration: DailyGameRow = {
        'Дата': formattedSheetDate,
        'Ник': currentUser['Ник'],
        'Номер телефона игрока': currentUser['Номер телефона'] || '',
        'Почта игрока': currentUser['Email'] || `${currentUser['Ник']}@baza.ru`,
        'Стоимость': cost || 3000,
        'Статус': 'Ожидает',
        'Имя': currentUser['Имя'] || currentUser['Ник'],
        'Вышел?': false,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: newRegistration,
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

      if (onRegisterSuccess) {
        onRegisterSuccess(formattedSheetDate, newRegistration);
      }
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = async () => {
    if (!currentUser || cancelling) return;

    setCancelling(true);

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'delete_where',
          criteria: {
            'Дата': formattedSheetDate,
            'Ник': currentUser['Ник'],
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.deletedCount !== 0) {
        if (onCancelSuccess) {
          onCancelSuccess(formattedSheetDate, currentUser['Ник']);
        }
      } else {
        alert('Не удалось отменить запись, попробуйте ещё раз.');
      }
    } catch (err) {
      console.error('Cancellation failed:', err);
      alert('Ошибка при отмене записи.');
    } finally {
      setCancelling(false);
    }
  };

  const mainDesc = (game['Описание'] || '').trim();
  const rawWhatWillBe = (game['"Что будет" описание'] || game['Что будет описание'] || '').trim();
  const whatWillBeDesc = rawWhatWillBe;

  const gameTitle = getFormattedGameTitle(game);

  const calendarStart = parsedStartTime || new Date(rawGameDateStr);
  const calendarEnd = new Date(calendarStart.getTime() + 3600000 * 4);
  const calendarUrl = generateCalendarLink(
    calendarStart,
    calendarEnd,
    gameTitle
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-y-contain"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-3xl space-y-4 shadow-2xl relative max-h-[85dvh] overflow-y-auto overscroll-y-contain pb-[calc(2rem+env(safe-area-inset-bottom))]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={game['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
              alt="Game"
              className="w-24 h-24 rounded-xl object-cover shrink-0 border border-brand"
            />
            <div className="space-y-1">
              <span className="text-xs font-bold text-brand">
                {formatRussianDate(game['Дата'] || game['Дата и Время'])}
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {gameTitle}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Календарь</span>
            </a>

            {isCompleted ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[44px]"
              >
                Завершено
              </button>
            ) : isUserRegistered ? (
              <button
                disabled={cancelling}
                onClick={handleCancel}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{cancelling ? 'Отмена...' : 'Отменить запись'}</span>
              </button>
            ) : !canRegister ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-700/60 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed min-h-[44px]"
              >
                {isGameStarted ? 'Игра началась' : 'Регистрация закрыта'}
              </button>
            ) : currentUser ? (
              <button
                disabled={registering}
                onClick={handleRegister}
                className="px-4 py-2 bg-brand hover:bg-brand-light text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {registering ? 'Запись...' : 'Записаться'}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground font-semibold">Войдите для записи</span>
            )}
          </div>
        </div>

        {(mainDesc || whatWillBeDesc) && (
          <div className="space-y-3 pt-2 border-t border-border/50">
            {mainDesc && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Описание</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{mainDesc}</p>
              </div>
            )}
            {whatWillBeDesc && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-brand uppercase tracking-wider">Что будет</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{whatWillBeDesc}</p>
              </div>
            )}
          </div>
        )}

        <div
          className={`grid ${
            hasRole ? 'grid-cols-3' : 'grid-cols-2'
          } gap-3 bg-muted p-3 rounded-xl text-xs font-bold border border-border`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand" />
            <span>
              Всего игроков:{' '}
              <strong className="text-foreground">{totalPlayers}</strong>
            </span>
          </div>
          {hasRole && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>
                Банк рейтинга:{' '}
                <strong className="text-emerald-400">{pool} ₽</strong>
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>
              Вес турнира:{' '}
              <strong className="text-amber-400">x{weight}</strong>
            </span>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <h4 className="font-bold text-sm text-foreground">Зарегистрированные Игроки</h4>
          {playersForGame.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              На эту дату пока нет зарегистрированных игроков.
            </p>
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
                  {playersForGame.map((p, pIdx) => (
                    <tr key={pIdx} className="hover:bg-muted/30">
                      <td
                        className="p-2.5 font-bold text-foreground cursor-pointer hover:text-brand hover:underline transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetNick = p['Ник'];
                          if (!targetNick) return;
                          if (isAdminOrOwner) {
                            router.push(`/club-register?nick=${encodeURIComponent(targetNick)}`);
                          } else {
                            router.push(`/results?nick=${encodeURIComponent(targetNick)}`);
                          }
                        }}
                      >
                        {p['Ник']}
                      </td>
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
}
