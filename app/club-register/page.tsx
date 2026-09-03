'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow, DailyGameRow, InClubRow, BountyOptionRow, RewardRow, DailyGameDateRow, formatRussianDate } from '@/types';
import { calculateBountyPoints } from '@/lib/calculations';
import { Users, Phone, Trophy, Award, CheckCircle2, X, PlusCircle, Swords, Play, RotateCcw } from 'lucide-react';

function ClubRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nickParam = searchParams.get('nick');

  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);
  const [gameDates, setGameDates] = useState<DailyGameDateRow[]>([]);
  const [inClubPlayers, setInClubPlayers] = useState<InClubRow[]>([]);
  const [bountyOptions, setBountyOptions] = useState<BountyOptionRow[]>([]);
  const [rewardsList, setRewardsList] = useState<RewardRow[]>([]);

  // Modals state
  const [activeModal, setActiveModal] = useState<'add_to_game' | 'result' | 'bounty' | 'task' | 'reward' | null>(null);

  // Add to game form
  const [selectedGameDate, setSelectedGameDate] = useState('');

  // Game Result form
  const [resultPlace, setResultPlace] = useState('1');
  const [resultChips, setResultChips] = useState('0');

  // Bounty form
  const [bountyType, setBountyType] = useState('Выбил игрока');
  const [bountyQty, setBountyQty] = useState('1');

  // Task form
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPoints, setTaskPoints] = useState('10');

  // Reward form
  const [rewardTitle, setRewardTitle] = useState('Преданность клубу');
  const [rewardQty, setRewardQty] = useState('1');

  // Feedback message
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

    async function loadClubData() {
      try {
        const [pRes, gRes, datesRes, icRes, bOptRes, rRes] = await Promise.all([
          fetch('/api/sheets?sheet=ИГРОКИ'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
          fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
          fetch('/api/sheets?sheet=В КЛУБЕ'),
          fetch('/api/sheets?sheet=Варианты баунти').catch(() => null),
          fetch('/api/sheets?sheet=НАГРАДЫ').catch(() => null),
        ]);

        const pData = await pRes.json();
        const gData = await gRes.json();
        const datesData = await datesRes.json();
        const icData = await icRes.json();
        const bOptData = bOptRes ? await bOptRes.json().catch(() => ({ data: [] })) : { data: [] };
        const rData = rRes ? await rRes.json().catch(() => ({ data: [] })) : { data: [] };

        let foundPlayer: PlayerRow | null = null;
        if (pData.data && Array.isArray(pData.data)) {
          if (nickParam) {
            foundPlayer = pData.data.find(
              (p: PlayerRow) => p['Ник']?.trim().toLowerCase() === nickParam.trim().toLowerCase()
            ) || null;
          }
          if (!foundPlayer && pData.data.length > 0) {
            foundPlayer = pData.data[0];
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
        if (icData.data && Array.isArray(icData.data)) setInClubPlayers(icData.data);
        if (bOptData.data && Array.isArray(bOptData.data)) setBountyOptions(bOptData.data);
        if (rData.data && Array.isArray(rData.data)) {
          setRewardsList(rData.data);
          if (rData.data[0] && rData.data[0]['Название']) {
            setRewardTitle(rData.data[0]['Название']);
          }
        }
      } catch (err) {
        console.error('Failed to load club register data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadClubData();
  }, [nickParam]);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;

  const activePlayerNick = selectedPlayer?.['Ник'] || '';

  // Filter game dates where registration deadline > now
  const availableGameDates = gameDates.filter((g) => {
    const deadlineStr = (g as any)['Дата окончания регистрации'] || g['Дата'] || (g as any)['Дата и Время'];
    if (!deadlineStr) return true;
    const deadline = new Date(deadlineStr);
    return isNaN(deadline.getTime()) || deadline.getTime() > Date.now();
  });

  // Selected player game history sorted by date descending
  const playerGameHistory = dailyGames
    .filter((g) => g['Ник']?.trim().toLowerCase() === activePlayerNick.trim().toLowerCase())
    .sort((a, b) => new Date(b['Дата']).getTime() - new Date(a['Дата']).getTime());

  // Check game states for action button visibility:
  // 1. Active game record exists? (i.e. game where player hasn't exited or is registered)
  const activeUnfinishedGame = playerGameHistory.find(
    (g) => !g['Вышел?'] || String(g['Вышел?']).toLowerCase() === 'false'
  );

  // 2. Pending result game? (game with started date / past date where Место is empty)
  const pendingResultGame = playerGameHistory.find((g) => {
    const placeVal = String(g['Место'] || '').trim();
    const isPlaceEmpty = !placeVal || placeVal === '-';
    return isPlaceEmpty;
  });

  // 3. Exited game that can be restored?
  const exitedGameToRestore = playerGameHistory.find(
    (g) => g['Вышел?'] === true || String(g['Вышел?']).toLowerCase() === 'true'
  );

  // Action: Add Player to Game
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

  // Action: Submit Game Result
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

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'update',
          keyName: 'Ник',
          keyValue: selectedPlayer['Ник'],
          rowData: updatedRow,
        }),
      });

      // Also append entry to "НАЧИСЛЕНИЕ НАГРАД" with "Преданность клубу"
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'НАЧИСЛЕНИЕ НАГРАД',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Название': 'Преданность клубу',
            'Количество': 1,
            'Дата': new Date().toISOString(),
          },
        }),
      });

      setDailyGames((prev) =>
        prev.map((g) => (g['Ник'] === selectedPlayer['Ник'] && g['Дата'] === targetGame['Дата'] ? updatedRow : g))
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

  // Action: Return Player to Game
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

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'update',
          keyName: 'Ник',
          keyValue: selectedPlayer['Ник'],
          rowData: restoredRow,
        }),
      });

      setDailyGames((prev) =>
        prev.map((g) => (g['Ник'] === selectedPlayer['Ник'] && g['Дата'] === exitedGameToRestore['Дата'] ? restoredRow : g))
      );

      setMessage('Игрок успешно возвращен в игру!');
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      console.error('Failed to return player to game:', err);
    }
  };

  // Action 3: Add Bounty
  const handleAddBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const qty = Number(bountyQty) || 1;
    const bountyPoints = calculateBountyPoints(bountyType, qty);

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '💰 БАУНТИ',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Кол-во': qty,
            'Баллы': bountyPoints,
            'Кто выбил': currentUser?.['Ник'] || 'Админ',
            'Дата': new Date().toISOString().split('T')[0],
          },
        }),
      });

      setMessage(`Баунти добавлено: +${bountyPoints} баллов!`);
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Action 4: Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !taskDesc.trim()) return;

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ЗАДАНИЯ',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Задание': taskDesc.trim(),
            'Баллы': Number(taskPoints) || 10,
            'Дата': new Date().toISOString().split('T')[0],
            'Статус': 'Выполнено',
          },
        }),
      });

      setMessage('Спецзадание успешно добавлено!');
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
        setTaskDesc('');
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Action 5: Assign Reward
  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !rewardTitle.trim()) return;

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'НАЧИСЛЕНИЕ НАГРАД',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Название': rewardTitle,
            'Количество': 1,
            'Дата': new Date().toISOString(),
            'Дата и время': new Date().toISOString(),
          },
        }),
      });

      setMessage(`Награда "${rewardTitle}" успешно начислена!`);
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error('Ошибка при начислении награды:', err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Регистрация и Внесение Результатов Игр</h1>
              <p className="text-xs text-muted-foreground">Профиль игрока, подтверждение посадки за стол, баунти и результаты</p>
            </div>
          </div>
        </div>


        {selectedPlayer && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Player Profile Card & Admin Actions */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-6 shadow-lg space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedPlayer['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={selectedPlayer['Ник']}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-brand shadow-md"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedPlayer['Ник']}</h2>
                    <p className="text-xs text-muted-foreground">{selectedPlayer['Имя']}</p>
                    <span className="inline-block mt-2">
                      <StatusBadge status={selectedPlayer['Статус'] || 'ИГРОК'} />
                    </span>
                  </div>
                </div>

                {/* Dial Phone Button Action */}
                <a
                  href="tel:79601274748"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition min-h-[44px]"
                >
                  <Phone className="w-4 h-4 text-brand" />
                  <span>Позвонить (+7 960 127-47-48)</span>
                </a>

                {/* QR Code */}
                <div className="pt-2">
                  <QRCodeDisplay
                    value={selectedPlayer['QR URL'] || selectedPlayer['QR'] || selectedPlayer['Ник']}
                    label={`QR Игрока ${selectedPlayer['Ник']}`}
                  />
                </div>
              </div>

              {/* Admin Action Control Buttons */}
              {isAdminOrOwner && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Действия Администратора</span>

                  {/* Button 1: Добавить в игру (visible if player is not currently in an active game) */}
                  {!activeUnfinishedGame && (
                    <button
                      onClick={() => setActiveModal('add_to_game')}
                      className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <Play className="w-4 h-4" /> Добавить в игру
                    </button>
                  )}

                  {/* Button 2: Внести результаты (visible if player has a game with Место empty / in active game) */}
                  {(pendingResultGame || activeUnfinishedGame) && (
                    <button
                      onClick={() => setActiveModal('result')}
                      className="w-full py-2.5 bg-brand/10 hover:bg-brand/20 text-brand-light font-bold rounded-xl border border-brand/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <Trophy className="w-4 h-4" /> Внести результаты игры
                    </button>
                  )}

                  {/* Button 3: Вернуть в игру (visible if player has Вышел? = true in a recent game) */}
                  {exitedGameToRestore && (
                    <button
                      onClick={handleReturnToGame}
                      className="w-full py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold rounded-xl border border-sky-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                    >
                      <RotateCcw className="w-4 h-4" /> Вернуть в игру
                    </button>
                  )}

                  <button
                    onClick={() => setActiveModal('reward')}
                    className="w-full py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 font-bold rounded-xl border border-pink-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                  >
                    <Award className="w-4 h-4" /> Начислить награду
                  </button>

                  <button
                    onClick={() => setActiveModal('bounty')}
                    className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl border border-amber-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                  >
                    <Swords className="w-4 h-4" /> Добавить баунти
                  </button>

                  <button
                    onClick={() => setActiveModal('task')}
                    className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-xl border border-purple-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                  >
                    <PlusCircle className="w-4 h-4" /> Добавить спецзадание
                  </button>
                </div>
              )}
            </div>

            {/* Current Game Registration & History Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Game Card if exists */}
              {activeUnfinishedGame ? (
                <div className="bg-gradient-to-r from-brand/20 via-card to-card border border-brand/40 rounded-2xl p-6 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-brand tracking-wider">Текущая Игра</span>
                    <StatusBadge status={activeUnfinishedGame['Статус'] || 'В ИГРЕ'} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Дата: {formatRussianDate(activeUnfinishedGame['Дата'])}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-xl text-xs font-semibold border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Стоимость</span>
                      <span className="text-emerald-400">{activeUnfinishedGame['Стоимость'] || 3000} ₽</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Телефон</span>
                      <span className="text-foreground">{activeUnfinishedGame['Номер телефона'] || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Email</span>
                      <span className="text-foreground">{activeUnfinishedGame['Почта'] || '-'}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Player History Table */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-foreground">История игр игрока</h3>

                {playerGameHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">История игр отсутствует.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="p-3">Дата</th>
                          <th className="p-3">Место</th>
                          <th className="p-3">Начислено</th>
                          <th className="p-3">Игроков в день</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {playerGameHistory.map((g, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{formatRussianDate(g['Дата'])}</td>
                            <td className="p-3 font-bold text-amber-400">#{g['Место'] || '-'}</td>
                            <td className="p-3 text-emerald-400 font-semibold">{g['Начислено'] || 0}</td>
                            <td className="p-3 text-foreground">{g['Рейтинг'] || g['Стоимость'] || '-'}</td>
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

        {/* Modal Form Overlay */}
        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
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
                  {/* Add To Game Modal */}
                  {activeModal === 'add_to_game' && (
                    <form onSubmit={handleAddToGameSubmit} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Игрока в Игру</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Выберите активную игру</label>
                        <select
                          value={selectedGameDate}
                          onChange={(e) => setSelectedGameDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
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
                        Добавить в игру
                      </button>
                    </form>
                  )}

                  {/* Game Result Modal */}
                  {activeModal === 'result' && (
                    <form onSubmit={handleSubmitResult} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Внесение Результатов Игры</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Занятое Место *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="50"
                          value={resultPlace}
                          onChange={(e) => setResultPlace(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Фишек куплено (0 - 1000)</label>
                        <input
                          type="number"
                          min="0"
                          max="1000"
                          value={resultChips}
                          onChange={(e) => setResultChips(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Сохранить результаты
                      </button>
                    </form>
                  )}

                  {/* Add Reward Modal */}
                  {activeModal === 'reward' && (
                    <form onSubmit={handleAddReward} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Начислить Награду</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Выберите награду</label>
                        <select
                          value={rewardTitle}
                          onChange={(e) => setRewardTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        >
                          {rewardsList.length > 0
                            ? rewardsList.map((r) => r['Название']).map((name, idx) => (
                                <option key={idx} value={name}>{name}</option>
                              ))
                            : ['Преданность клубу', 'Комбинации', 'Игровые', 'Турнирные'].map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                              ))
                          }
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Количество</label>
                        <input
                          type="number"
                          min="1"
                          value={rewardQty}
                          onChange={(e) => setRewardQty(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Начислить награду
                      </button>
                    </form>
                  )}

                  {/* Add Bounty Modal */}
                  {activeModal === 'bounty' && (
                    <form onSubmit={handleAddBounty} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Баунти</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Тип начисления</label>
                        <select
                          value={bountyType}
                          onChange={(e) => setBountyType(e.target.value)}
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        >
                          {(bountyOptions.length > 0
                            ? bountyOptions.map((b) => b['Вариант'])
                            : ['Выбил игрока', 'Выбил вице чемпиона', 'Выбил чемпиона']
                          ).map((opt, idx) => (
                            <option key={idx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Количество</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={bountyQty}
                          onChange={(e) => setBountyQty(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl min-h-[44px]"
                      >
                        Начислить баунти
                      </button>
                    </form>
                  )}

                  {/* Add Special Task Modal */}
                  {activeModal === 'task' && (
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Спецзадание</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Описание задания *</label>
                        <input
                          type="text"
                          required
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          placeholder="Сделать роял флеш..."
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Баллы</label>
                        <input
                          type="number"
                          value={taskPoints}
                          onChange={(e) => setTaskPoints(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Сохранить задание
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

export default function ClubRegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Загрузка...</div>}>
      <ClubRegisterContent />
    </Suspense>
  );
}
