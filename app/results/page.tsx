'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow, DailyGameRow, DailyGameDateRow, formatRussianDate } from '@/types';
import { isExited, isGameFinished, isPlayerPlaceFilled, isGameDateCompleted } from '@/lib/calculations';
import { Trophy, CheckCircle2, X, Play, RotateCcw, Award } from 'lucide-react';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerIdParam = searchParams.get('playerId');
  const nickParam = searchParams.get('nick');

  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);
  const [gameDates, setGameDates] = useState<DailyGameDateRow[]>([]);

  // Modals / forms state
  const [activeModal, setActiveModal] = useState<'add_to_game' | 'result' | null>(null);
  const [selectedGameDate, setSelectedGameDate] = useState('');
  const [resultPlace, setResultPlace] = useState('1');
  const [resultChips, setResultChips] = useState('0');

  const [message, setMessage] = useState('');
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

    async function loadData() {
      try {
        const [pRes, gRes, datesRes] = await Promise.all([
          fetch('/api/sheets?sheet=ИГРОКИ'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
          fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
        ]);

        const pData = await pRes.json();
        const gData = await gRes.json();
        const datesData = await datesRes.json();

        let foundPlayer: PlayerRow | null = null;
        if (pData.data && Array.isArray(pData.data)) {
          if (playerIdParam) {
            foundPlayer = pData.data.find(
              (p: PlayerRow) => p['User ID']?.trim() === playerIdParam.trim()
            ) || null;
          }
          if (!foundPlayer && nickParam) {
            foundPlayer = pData.data.find(
              (p: PlayerRow) => p['Ник']?.trim().toLowerCase() === nickParam.trim().toLowerCase()
            ) || null;
          }
        }
        setSelectedPlayer(foundPlayer);

        if (gData.data && Array.isArray(gData.data)) setDailyGames(gData.data);
        if (datesData.data && Array.isArray(datesData.data)) {
          setGameDates(datesData.data);
          if (datesData.data[0]) {
            setSelectedGameDate(datesData.data[0]['Дата'] || datesData.data[0]['Дата и Время']);
          }
        }
      } catch (err) {
        console.error('Failed to load results page data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [playerIdParam, nickParam]);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;
  const activePlayerNick = selectedPlayer?.['Ник'] || '';

  const playerGameHistory = dailyGames
    .filter((g) => g['Ник']?.trim().toLowerCase() === activePlayerNick.trim().toLowerCase())
    .sort((a, b) => new Date(b['Дата']).getTime() - new Date(a['Дата']).getTime());

  const activeUnfinishedGame = playerGameHistory.find((g) => !isPlayerPlaceFilled(g));

  const pendingResultGame = playerGameHistory.find((g) => !isPlayerPlaceFilled(g) && !isExited(g));

  const exitedGameToRestore = playerGameHistory.find((g) => isExited(g));

  const availableGameDates = gameDates.filter((g) => {
    const deadlineStr = (g as any)['Дата окончания регистрации'] || g['Дата'] || (g as any)['Дата и Время'];
    if (!deadlineStr) return true;
    const deadline = new Date(deadlineStr);
    return isNaN(deadline.getTime()) || deadline.getTime() > Date.now();
  });

  const handleAddToGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedGameDate) return;

    try {
      const newGameRow: DailyGameRow = {
        'Дата': selectedGameDate,
        'Ник': selectedPlayer['Ник'],
        'Рейтинг': selectedPlayer['Общий рейтинг'] || 1000,
        'Баунти': 0,
        'Место': '-',
        'Начислено': 0,
        'Стоимость': 3000,
        'Номер телефона': selectedPlayer['Номер телефона'] || '',
        'Почта': selectedPlayer['Email'] || `${selectedPlayer['Ник']}@baza.ru`,
        'Статус': 'Ожидает',
        'Подтвержден?': false,
        'Имя': selectedPlayer['Имя'],
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: newGameRow,
        }),
      });

      setDailyGames((prev) => [...prev, newGameRow]);
      setMessage('Игрок успешно добавлен в игру!');
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add player to game:', err);
    }
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGame = pendingResultGame || activeUnfinishedGame;
    if (!selectedPlayer || !targetGame) return;

    const place = Number(resultPlace) || 1;
    const chips = Number(resultChips) || 0;
    const gamePlayersCount = dailyGames.filter((g) => g['Дата'] === targetGame['Дата']).length || 10;
    const calculatedPoints = Math.max(10, (gamePlayersCount - place + 1) * 10) + chips;

    try {
      const updatedRow = {
        ...targetGame,
        'Место': place,
        'Вышел?': true,
        'Время выхода': new Date().toISOString(),
        'Начислено': calculatedPoints,
      };

      const keyName = targetGame['🔒 Row ID'] ? '🔒 Row ID' : 'Ник';
      const keyValue = targetGame['🔒 Row ID'] || selectedPlayer['Ник'];

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'update',
          keyName,
          keyValue,
          targetDate: targetGame['Дата'],
          rowData: updatedRow,
          userRole: currentUser?.['Роль'] || '',
          isAdmin: isAdminOrOwner,
        }),
      });

      setDailyGames((prev) =>
        prev.map((g) =>
          g['Ник']?.trim().toLowerCase() === selectedPlayer['Ник']?.trim().toLowerCase() && g['Дата'] === targetGame['Дата']
            ? updatedRow
            : g
        )
      );

      setMessage(`Результаты внесены: Место #${place}, Начислено ${calculatedPoints} очков!`);
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit result:', err);
    }
  };

  const handleReturnToGame = async () => {
    if (!selectedPlayer || !exitedGameToRestore) return;

    try {
      const restoredRow = {
        ...exitedGameToRestore,
        'Вышел?': false,
        'Место': '',
        'Время выхода': '',
        'Статус': 'Играет',
      };

      const keyName = exitedGameToRestore['🔒 Row ID'] ? '🔒 Row ID' : 'Ник';
      const keyValue = exitedGameToRestore['🔒 Row ID'] || selectedPlayer['Ник'];

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'update',
          keyName,
          keyValue,
          targetDate: exitedGameToRestore['Дата'],
          rowData: restoredRow,
          userRole: currentUser?.['Роль'] || '',
          isAdmin: isAdminOrOwner,
        }),
      });

      setDailyGames((prev) =>
        prev.map((g) =>
          g['Ник']?.trim().toLowerCase() === selectedPlayer['Ник']?.trim().toLowerCase() && g['Дата'] === exitedGameToRestore['Дата']
            ? restoredRow
            : g
        )
      );

      setMessage('Игрок успешно возвращен в игру!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Failed to return player to game:', err);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 sm:p-6 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white">Внесение Результатов Игрока</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">
              Сканирование QR-кода игрока: {nickParam || selectedPlayer?.['Ник'] || 'Игрок'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Загрузка данных игрока...</div>
        ) : !selectedPlayer ? (
          <div className="p-8 bg-slate-900/60 border border-white/10 rounded-2xl text-center text-slate-400 space-y-4">
            <p className="text-sm">Игрок не найден.</p>
            <button
              onClick={() => router.push('/club-register')}
              className="px-4 py-2 bg-[#014373] text-white rounded-xl text-xs font-bold"
            >
              Перейти к регистрации
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Info Card */}
            <div className="lg:col-span-1 bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-lg space-y-6 flex flex-col justify-between backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedPlayer['Аватар'] ? (
                    <img
                      src={selectedPlayer['Аватар']}
                      alt={selectedPlayer['Ник']}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#014373]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-[#014373] text-sky-400 font-black text-xl flex items-center justify-center shrink-0">
                      {selectedPlayer['Ник']?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedPlayer['Ник']}</h2>
                    <p className="text-xs text-slate-400">{selectedPlayer['Имя']}</p>
                    <span className="inline-block mt-2">
                      <StatusBadge status={selectedPlayer['Статус'] || '👤'} />
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <QRCodeDisplay
                    value={`${baseUrl}/results?playerId=${encodeURIComponent(selectedPlayer['User ID'] || '')}&nick=${encodeURIComponent(selectedPlayer['Ник'] || '')}`}
                    label={`QR Игрока ${selectedPlayer['Ник']}`}
                  />
                </div>
              </div>

              {/* Admin Actions */}
              {isAdminOrOwner && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Действия с игроком</span>

                  {!activeUnfinishedGame && (
                    <button
                      onClick={() => setActiveModal('add_to_game')}
                      className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <Play className="w-4 h-4" /> Зарегистрировать на игру
                    </button>
                  )}

                  {activeUnfinishedGame && (
                    <button
                      onClick={() => setActiveModal('result')}
                      className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <Trophy className="w-4 h-4 text-amber-400" /> Внести результаты
                    </button>
                  )}

                  {exitedGameToRestore && (
                    <button
                      onClick={handleReturnToGame}
                      className="w-full py-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 font-bold rounded-xl border border-sky-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <RotateCcw className="w-4 h-4" /> Вернуть в игру
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Games & Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Game Card */}
              {activeUnfinishedGame && (
                <div className="bg-gradient-to-r from-[#014373]/30 via-slate-900 to-slate-900 border border-[#014373]/40 rounded-2xl p-6 shadow-lg space-y-3 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-sky-400 tracking-wider">Текущая Игра</span>
                    <StatusBadge status={activeUnfinishedGame['Статус'] || 'В ИГРЕ'} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Дата: {formatRussianDate(activeUnfinishedGame['Дата'])}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/40 p-3 rounded-xl text-xs font-semibold border border-white/5">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Стоимость</span>
                      <span className="text-emerald-400">{activeUnfinishedGame['Стоимость'] || 3000} ₽</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Телефон</span>
                      <span className="text-white">{activeUnfinishedGame['Номер телефона'] || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Email</span>
                      <span className="text-white">{activeUnfinishedGame['Почта'] || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Game History */}
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-2.5 sm:p-6 shadow-sm space-y-2 sm:space-y-4 backdrop-blur-xl">
                <h3 className="text-sm sm:text-lg font-bold text-white">История результатов</h3>

                {playerGameHistory.length === 0 ? (
                  <p className="text-[11px] sm:text-xs text-slate-400 py-4 text-center">История игр отсутствует.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/5">
                    <table className="w-full text-[10px] sm:text-xs text-left table-fixed">
                      <thead className="bg-slate-800/60 text-slate-400 uppercase border-b border-white/10 text-[9px] sm:text-xs tracking-tight">
                        <tr>
                          <th className="w-[45%] sm:w-auto px-2 py-1.5 sm:p-3">Дата</th>
                          <th className="w-[25%] sm:w-auto px-2 py-1.5 sm:p-3">Место</th>
                          <th className="w-[30%] sm:w-auto px-2 py-1.5 sm:p-3">Очки</th>
                          <th className="px-2 py-1.5 sm:p-3 hidden sm:table-cell">Взнос</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 leading-tight">
                        {playerGameHistory.map((g, idx) => {
                          const isCompleted = isGameDateCompleted(g['Дата'], gameDates);
                          const placeFilled = isPlayerPlaceFilled(g);
                          const finished = isCompleted || placeFilled;
                          const placeVal = String(g['Место'] || '').trim();
                          const displayPlace = placeFilled && placeVal !== '-'
                            ? `#${placeVal}`
                            : isExited(g)
                            ? 'Вышел'
                            : 'В игре';

                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="px-2 py-1.5 sm:p-3 text-slate-300 truncate">{formatRussianDate(g['Дата'])}</td>
                              <td className={`px-2 py-1.5 sm:p-3 font-bold ${finished ? 'text-amber-400' : 'text-sky-400'}`}>
                                {displayPlace}
                              </td>
                              <td className="px-2 py-1.5 sm:p-3 text-emerald-400 font-semibold">+{g['Начислено'] || 0}</td>
                              <td className="px-2 py-1.5 sm:p-3 text-white hidden sm:table-cell">{g['Рейтинг'] || g['Стоимость'] || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Form Overlay */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {message ? (
                <div className="py-6 flex flex-col items-center gap-2 text-emerald-400 font-bold text-center">
                  <CheckCircle2 className="w-10 h-10" />
                  <span>{message}</span>
                </div>
              ) : (
                <>
                  {activeModal === 'add_to_game' && (
                    <form onSubmit={handleAddToGameSubmit} className="space-y-4">
                      <h3 className="text-lg font-bold text-white">Добавить Игрока в Игру</h3>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 mb-1 block">Выберите дату турнира</label>
                        <select
                          value={selectedGameDate}
                          onChange={(e) => setSelectedGameDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white min-h-[44px]"
                        >
                          {(availableGameDates.length > 0 ? availableGameDates : gameDates).map((g, idx) => (
                            <option key={idx} value={g['Дата'] || g['Дата и Время']}>
                              {formatRussianDate(g['Дата'] || g['Дата и Время'])}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Зарегистрировать на турнир
                      </button>
                    </form>
                  )}

                  {activeModal === 'result' && (
                    <form onSubmit={handleSubmitResult} className="space-y-4">
                      <h3 className="text-lg font-bold text-white">Внесение Результатов Игры</h3>
                      {(pendingResultGame || activeUnfinishedGame) && (
                        <div className="p-2.5 bg-slate-800 rounded-lg text-xs text-sky-400 font-semibold border border-white/5">
                          Целевая игра: {formatRussianDate((pendingResultGame || activeUnfinishedGame)!['Дата'])}
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Занятое Место *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="50"
                          value={resultPlace}
                          onChange={(e) => setResultPlace(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400">Фишек куплено</label>
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={resultChips}
                          onChange={(e) => setResultChips(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Сохранить результаты
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Загрузка...</div>}>
      <ResultsContent />
    </Suspense>
  );
}
