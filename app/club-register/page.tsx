'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow, DailyGameRow, InClubRow, BountyOptionRow } from '@/types';
import { calculateBountyPoints } from '@/lib/calculations';
import { Users, Search, Phone, Trophy, Award, CheckCircle2, X, PlusCircle, Swords, Play } from 'lucide-react';

export default function ClubRegisterPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [dailyGames, setDailyGames] = useState<DailyGameRow[]>([]);
  const [inClubPlayers, setInClubPlayers] = useState<InClubRow[]>([]);
  const [bountyOptions, setBountyOptions] = useState<BountyOptionRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<'result' | 'bounty' | 'task' | 'reward' | null>(null);

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
        const [pRes, gRes, icRes, bOptRes] = await Promise.all([
          fetch('/api/sheets?sheet=ИГРОКИ'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
          fetch('/api/sheets?sheet=В КЛУБЕ'),
          fetch('/api/sheets?sheet=Варианты баунти').catch(() => null),
        ]);

        const pData = await pRes.json();
        const gData = await gRes.json();
        const icData = await icRes.json();
        const bOptData = bOptRes ? await bOptRes.json().catch(() => ({ data: [] })) : { data: [] };

        if (pData.data && Array.isArray(pData.data)) {
          setPlayers(pData.data);
          if (pData.data[0]) setSelectedPlayer(pData.data[0]);
        }
        if (gData.data && Array.isArray(gData.data)) setDailyGames(gData.data);
        if (icData.data && Array.isArray(icData.data)) setInClubPlayers(icData.data);
        if (bOptData.data && Array.isArray(bOptData.data)) setBountyOptions(bOptData.data);
      } catch (err) {
        console.error('Failed to load club register data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadClubData();
  }, []);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;

  const filteredPlayers = players.filter(
    (p) =>
      p['Ник']?.toLowerCase().includes(search.toLowerCase()) ||
      p['Имя']?.toLowerCase().includes(search.toLowerCase())
  );

  const activePlayerNick = selectedPlayer?.['Ник'] || '';

  // Selected player game history
  const playerGameHistory = dailyGames.filter(
    (g) => g['Ник']?.trim().toLowerCase() === activePlayerNick.trim().toLowerCase()
  );

  // Active uncompleted game registration
  const activeRegistration = playerGameHistory.find(
    (g) => !g['Место'] || g['Место'] === '-' || String(g['Место']).trim() === ''
  ) || playerGameHistory[0];

  // In club entry for selected player
  const playerInClub = inClubPlayers.find(
    (ic) => ic['Ник']?.trim().toLowerCase() === activePlayerNick.trim().toLowerCase()
  );

  // Action 1: "В играющее"
  const handleMoveToPlaying = async () => {
    if (!selectedPlayer) return;
    try {
      // 1. Update status in "В КЛУБЕ"
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'В КЛУБЕ',
          action: 'update',
          keyName: 'Ник',
          keyValue: selectedPlayer['Ник'],
          rowData: {
            ...playerInClub,
            'Ник': selectedPlayer['Ник'],
            'Статус': 'Играет',
            'Подтвержден?': true,
          },
        }),
      });

      // 2. Add reward "Преданность клубу" to "НАЧИСЛЕНИЕ НАГРАД"
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
            'Дата': new Date().toISOString().split('T')[0],
          },
        }),
      });

      setMessage('Игрок переведен в играющие! Начислена награда "Преданность клубу".');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  // Action 2: Submit Game Result
  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !activeRegistration) return;

    const place = Number(resultPlace) || 1;
    const chips = Number(resultChips) || 0;
    const pointsAwarded = Math.max(10, 100 - place * 10) + chips;

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'update',
          keyName: 'Ник',
          keyValue: selectedPlayer['Ник'],
          rowData: {
            ...activeRegistration,
            'Место': place,
            'Начислено': pointsAwarded,
            'Статус': '',
            'Подтвержден?': false,
            'Вышел?': true,
            'Время выхода': new Date().toISOString(),
          },
        }),
      });

      setMessage(`Результат сохранен: Место #${place}, Начислено ${pointsAwarded} баллов.`);
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error(err);
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
          sheetName: 'Задания',
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

      setMessage('Спецзадание успшено добавлено!');
      setTimeout(() => {
        setMessage('');
        setActiveModal(null);
        setTaskDesc('');
      }, 1500);
    } catch (err) {
      console.error(err);
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

        {/* Player Selection Bar */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск игрока по никнейму или имени..."
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {filteredPlayers.slice(0, 5).map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPlayer(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  selectedPlayer?.['Ник'] === p['Ник']
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-muted text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {p['Ник']}
              </button>
            ))}
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
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">Панель Управления</span>

                  <button
                    onClick={handleMoveToPlaying}
                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                  >
                    <Play className="w-4 h-4" /> В играющее (Посадить за стол)
                  </button>

                  <button
                    onClick={() => setActiveModal('result')}
                    className="w-full py-2.5 bg-brand/10 hover:bg-brand/20 text-brand-light font-bold rounded-xl border border-brand/30 flex items-center justify-center gap-2 text-xs transition min-h-[44px]"
                  >
                    <Trophy className="w-4 h-4" /> Внесение результатов игры
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
              {/* Active Game Registration Card */}
              {activeRegistration ? (
                <div className="bg-gradient-to-r from-brand/20 via-card to-card border border-brand/40 rounded-2xl p-6 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-brand tracking-wider">Текущая Регистрация на Играх</span>
                    <StatusBadge status={activeRegistration['Статус'] || 'Зарегистрирован'} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Дата Турнира: {activeRegistration['Дата']}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-muted/40 p-3 rounded-xl text-xs font-semibold border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Стоимость</span>
                      <span className="text-emerald-400">{activeRegistration['Стоимость'] || 3000} ₽</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Телефон</span>
                      <span className="text-foreground">{activeRegistration['Номер телефона'] || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Email</span>
                      <span className="text-foreground">{activeRegistration['Почта'] || '-'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
                  Нет активной несыгранной регистрации для выбранного игрока.
                </div>
              )}

              {/* Player History Table */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-foreground">История игр игрока ({selectedPlayer['Ник']})</h3>

                {playerGameHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">История игр отсутствует.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/60 text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="p-3">Дата</th>
                          <th className="p-3">Ник</th>
                          <th className="p-3">Место</th>
                          <th className="p-3">Начислено</th>
                          <th className="p-3">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {playerGameHistory.map((g, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{g['Дата']}</td>
                            <td className="p-3 font-bold text-foreground">{g['Ник']}</td>
                            <td className="p-3 font-bold text-amber-400">#{g['Место'] || '-'}</td>
                            <td className="p-3 text-emerald-400 font-semibold">{g['Начислено'] || 0}</td>
                            <td className="p-3"><StatusBadge status={g['Статус'] || 'ИГРАЕТ'} /></td>
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
                        <label className="text-xs font-semibold text-muted-foreground">Куплено фишек (0 - 1000)</label>
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
