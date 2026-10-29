'use client';

import React, { useState } from 'react';
import { DailyGameDateRow, DailyGameRow, PlayerRow, formatRussianDate } from '@/types';
import { Trash2, Users, CheckCircle2, Edit, Users as UsersIcon } from 'lucide-react';

export function parseRussianDateTime(str: string | undefined | null): Date | null {
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

export function formatDateForSheet(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
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

export function getFormattedGameTitle(game: any): string {
  const fallbackTitle = (game && game['Название']) || 'Игра';
  if (!game) return fallbackTitle;

  const rawDate = game['Дата и Время'] || game['Дата'] || '';
  if (!rawDate) return fallbackTitle;

  const d = parseRussianDateTime(rawDate);
  if (!d || isNaN(d.getTime())) return fallbackTitle;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateFormatted = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

  const trimmed = String(rawDate).trim();
  const hasTime = /\d{1,2}:\d{2}/.test(trimmed);

  if (hasTime) {
    const timeFormatted = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `Игра ${dateFormatted} в ${timeFormatted}`;
  }

  return `Игра ${dateFormatted}`;
}

export interface GameCardProps {
  game: DailyGameDateRow;
  dailyGames: DailyGameRow[];
  currentUser: PlayerRow | null;
  isAdminOrOwner?: boolean;
  hasRole?: boolean;
  onSelectGame?: (game: DailyGameDateRow) => void;
  onRegisterSuccess?: (gameDateStr: string, newRegistration: DailyGameRow) => void;
  onCancelSuccess?: (gameDateStr: string, nick: string) => void;
  onToggleCompletion?: (game: DailyGameDateRow, e?: React.MouseEvent) => void;
  onEditGame?: (game: DailyGameDateRow, e?: React.MouseEvent) => void;
  onDeleteGame?: (dateVal: string, e?: React.MouseEvent) => void;
}

export const GameCard: React.FC<GameCardProps> = React.memo(function GameCard({
  game,
  dailyGames,
  currentUser,
  isAdminOrOwner = false,
  hasRole = false,
  onSelectGame,
  onRegisterSuccess,
  onCancelSuccess,
  onToggleCompletion,
  onEditGame,
  onDeleteGame,
}: GameCardProps) {
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const rawGameDate = game['Дата и Время'] || game['Дата'] || '';
  const formattedSheetDate = formatDateForSheet(rawGameDate);
  const parsedGameStartTime = parseRussianDateTime(rawGameDate);
  const now = new Date();

  const isGameStarted = parsedGameStartTime ? parsedGameStartTime <= now : false;
  const isCompleted =
    game['Завершено?'] === true ||
    String(game['Завершено?']).toLowerCase() === 'true' ||
    game['Завершено?'] === '✓' ||
    game['Завершено?'] === '1';

  const gamePlayers = dailyGames.filter(
    (g) => formatDateForSheet(g['Дата'] || '') === formattedSheetDate
  );
  const totalPlayers = game['Всего игроков'] !== undefined && game['Всего игроков'] !== ''
    ? Number(game['Всего игроков']) || gamePlayers.length
    : gamePlayers.length;

  const cost = game['Стоимость'] || game['Банк рейтинга'] || 0;
  const pool = game['Банк рейтинга'] || game['Стоимость'] || 0;
  const weight = game['Вес турнира'] || '1.0';

  const regDeadlineStr = (game as any)['Дата окончания регистрации'];
  const parsedRegDeadline = regDeadlineStr ? parseRussianDateTime(regDeadlineStr) : parsedGameStartTime;
  const isRegDeadlinePassed = parsedRegDeadline ? now >= parsedRegDeadline : false;

  const currentNick = currentUser?.['Ник']?.trim().toLowerCase();
  const isUserRegistered = Boolean(
    currentNick &&
      gamePlayers.some((g) => g['Ник']?.trim().toLowerCase() === currentNick)
  );

  const canRegister = !isCompleted && (isAdminOrOwner || (!isGameStarted && !isRegDeadlinePassed));

  const title = getFormattedGameTitle(game);

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div
      onClick={() => onSelectGame?.(game)}
      className={`bg-slate-900/90 border border-white/10 hover:border-[#014373]/50 rounded-2xl overflow-hidden shadow-lg cursor-pointer transition flex flex-col justify-between relative group ${
        isCompleted ? 'opacity-70' : ''
      }`}
    >
      <div className="relative h-40 bg-slate-800">
        <img
          src={game['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        <span
          className={`absolute top-3 left-3 text-white text-xs font-bold px-3 py-1 rounded-md shadow-md z-10 ${
            isCompleted ? 'bg-slate-700' : isGameStarted ? 'bg-amber-600' : 'bg-[#014373]'
          }`}
        >
          {isCompleted
            ? '✅ Завершено'
            : isGameStarted
            ? '🔴 Идет игра'
            : formatRussianDate(rawGameDate)}
        </span>

        {isAdminOrOwner && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 bg-black/85 p-1 rounded-lg z-20 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {onToggleCompletion && (
              <button
                onClick={(e) => onToggleCompletion(game, e)}
                className={`p-1.5 transition flex items-center justify-center min-w-[38px] min-h-[38px] ${
                  isCompleted ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/80 hover:text-emerald-400'
                }`}
                title={isCompleted ? 'Вернуть в активные' : 'Завершить игру'}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {onEditGame && (
              <button
                onClick={(e) => onEditGame(game, e)}
                className="p-1.5 text-white/80 hover:text-sky-400 transition flex items-center justify-center min-w-[38px] min-h-[38px]"
                title="Изменить"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDeleteGame && (
              <button
                onClick={(e) => onDeleteGame(rawGameDate, e)}
                className="p-1.5 text-white/80 hover:text-rose-400 transition flex items-center justify-center min-w-[38px] min-h-[38px]"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h4 className="font-bold text-white text-base leading-tight group-hover:text-sky-400 transition-colors">
            {title}
          </h4>
        </div>

        <div className={`grid ${hasRole ? 'grid-cols-3' : 'grid-cols-2'} gap-2 bg-slate-800/50 p-2.5 rounded-xl text-[11px] border border-white/5 text-center font-semibold`}>
          <div>
            <span className="text-slate-400 block text-[10px]">Игроков</span>
            <span className="text-white font-bold">{totalPlayers}</span>
          </div>
          {hasRole && (
            <div>
              <span className="text-slate-400 block text-[10px]">Банк</span>
              <span className="text-emerald-400 font-bold">{pool} ₽</span>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[10px]">Вес</span>
            <span className="text-amber-400 font-bold">x{weight}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          {isCompleted ? (
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed min-h-[38px]"
            >
              Завершено
            </button>
          ) : isUserRegistered ? (
            <button
              disabled={cancelling}
              onClick={handleCancel}
              className="px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 min-h-[38px] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{cancelling ? 'Отмена...' : 'Отменить запись'}</span>
            </button>
          ) : !canRegister ? (
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 font-bold text-xs rounded-xl cursor-not-allowed min-h-[38px]"
            >
              {isGameStarted ? 'Игра началась' : 'Регистрация закрыта'}
            </button>
          ) : (
            <button
              disabled={registering}
              onClick={handleRegister}
              className="px-4 py-2 bg-gradient-to-r from-[#014373] to-sky-700 hover:from-[#013357] hover:to-sky-800 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 min-h-[38px] flex items-center gap-1.5 border border-white/10"
            >
              {registering ? (
                <span>Запись...</span>
              ) : (
                <>
                  <span>Записаться</span>
                </>
              )}
            </button>
          )}

          <span className="text-xs font-bold text-sky-400 group-hover:underline flex items-center gap-1 shrink-0">
            Подробнее <UsersIcon className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
});

GameCard.displayName = 'GameCard';
