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

export interface GameCardProps {
  game: DailyGameDateRow;
  dailyGames: DailyGameRow[];
  currentUser: PlayerRow | null;
  isAdminOrOwner?: boolean;
  hasRole?: boolean;
  compact?: boolean;
  onSelectGame?: (game: DailyGameDateRow) => void;
  onRegisterSuccess?: (gameDateStr: string, newRegistration: DailyGameRow) => void;
  onCancelSuccess?: (gameDateStr: string, nick: string) => void;
  onToggleCompletion?: (game: DailyGameDateRow, e?: React.MouseEvent) => void;
  onEditGame?: (game: DailyGameDateRow, e?: React.MouseEvent) => void;
  onDeleteGame?: (dateVal: string, e?: React.MouseEvent) => void;
}

export function GameCard({
  game,
  dailyGames,
  currentUser,
  isAdminOrOwner = false,
  hasRole = false,
  compact = false,
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

  const title = game['Название'] || 'Игра';
  const description = game['Описание'] || game['"Что будет" описание'] || '';

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
      className={`bg-slate-900/60 border border-white/10 hover:border-[#014373]/50 rounded-2xl overflow-hidden shadow-lg backdrop-blur-md cursor-pointer transition flex flex-col justify-between relative group ${
        isCompleted ? 'opacity-70' : ''
      }`}
    >
      <div className={`relative bg-slate-800 ${compact ? 'h-28' : 'h-40'}`}>
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
          className={`absolute text-white font-bold rounded-md shadow-md z-10 ${
            compact ? 'top-2 left-2 text-[10px] px-2 py-0.5' : 'top-3 left-3 text-xs px-3 py-1'
          } ${
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
            className={`absolute flex items-center bg-black/70 backdrop-blur-sm rounded-lg z-20 ${
              compact ? 'top-2 right-2 gap-0.5 p-0.5' : 'top-3 right-3 gap-1 p-1'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {onToggleCompletion && (
              <button
                onClick={(e) => onToggleCompletion(game, e)}
                className={`transition flex items-center justify-center ${
                  compact ? 'p-1 min-w-[30px] min-h-[30px]' : 'p-1.5 min-w-[38px] min-h-[38px]'
                } ${
                  isCompleted ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/80 hover:text-emerald-400'
                }`}
                title={isCompleted ? 'Вернуть в активные' : 'Завершить игру'}
              >
                <CheckCircle2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </button>
            )}
            {onEditGame && (
              <button
                onClick={(e) => onEditGame(game, e)}
                className={`text-white/80 hover:text-sky-400 transition flex items-center justify-center ${
                  compact ? 'p-1 min-w-[30px] min-h-[30px]' : 'p-1.5 min-w-[38px] min-h-[38px]'
                }`}
                title="Изменить"
              >
                <Edit className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </button>
            )}
            {onDeleteGame && (
              <button
                onClick={(e) => onDeleteGame(rawGameDate, e)}
                className={`text-white/80 hover:text-rose-400 transition flex items-center justify-center ${
                  compact ? 'p-1 min-w-[30px] min-h-[30px]' : 'p-1.5 min-w-[38px] min-h-[38px]'
                }`}
                title="Удалить"
              >
                <Trash2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 flex flex-col justify-between ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
        <div className="space-y-0.5">
          <h4 className={`font-bold text-white leading-tight group-hover:text-sky-400 transition-colors ${
            compact ? 'text-sm' : 'text-base'
          }`}>
            {title}
          </h4>
          {description && (
            <p className={`text-slate-400 line-clamp-2 leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}>
              {description}
            </p>
          )}
        </div>

        <div className={`grid ${hasRole ? 'grid-cols-3' : 'grid-cols-2'} bg-slate-800/50 rounded-xl border border-white/5 text-center font-semibold ${
          compact ? 'gap-1 p-1.5 text-[10px]' : 'gap-2 p-2.5 text-[11px]'
        }`}>
          <div>
            <span className="text-slate-400 block text-[9px]">Игроков</span>
            <span className="text-white font-bold">{totalPlayers}</span>
          </div>
          {hasRole && (
            <div>
              <span className="text-slate-400 block text-[9px]">Банк</span>
              <span className="text-emerald-400 font-bold">{pool} ₽</span>
            </div>
          )}
          <div>
            <span className="text-slate-400 block text-[9px]">Вес</span>
            <span className="text-amber-400 font-bold">x{weight}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
          {isCompleted ? (
            <button
              disabled
              className={`bg-slate-800 text-slate-500 font-bold rounded-xl cursor-not-allowed ${
                compact ? 'px-3 py-1 text-[11px] min-h-[32px]' : 'px-4 py-2 text-xs min-h-[38px]'
              }`}
            >
              Завершено
            </button>
          ) : isUserRegistered ? (
            <button
              disabled={cancelling}
              onClick={handleCancel}
              className={`bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold rounded-xl transition flex items-center gap-1 min-h-[32px] disabled:opacity-50 ${
                compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs min-h-[38px]'
              }`}
            >
              <Trash2 className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
              <span>{cancelling ? 'Отмена...' : 'Отменить запись'}</span>
            </button>
          ) : !canRegister ? (
            <button
              disabled
              className={`bg-slate-800 text-slate-500 font-bold rounded-xl cursor-not-allowed ${
                compact ? 'px-3 py-1 text-[11px] min-h-[32px]' : 'px-4 py-2 text-xs min-h-[38px]'
              }`}
            >
              {isGameStarted ? 'Игра началась' : 'Регистрация закрыта'}
            </button>
          ) : (
            <button
              disabled={registering}
              onClick={handleRegister}
              className={`bg-gradient-to-r from-[#014373] to-sky-700 hover:from-[#013357] hover:to-sky-800 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1 border border-white/10 ${
                compact ? 'px-3 py-1 text-[11px] min-h-[32px]' : 'px-4 py-2 text-xs min-h-[38px]'
              }`}
            >
              {registering ? (
                <span>Запись...</span>
              ) : (
                <span>Записаться</span>
              )}
            </button>
          )}

          <span className={`font-bold text-sky-400 group-hover:underline flex items-center gap-1 shrink-0 ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}>
            Подробнее <UsersIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          </span>
        </div>
      </div>
    </div>
  );
}
