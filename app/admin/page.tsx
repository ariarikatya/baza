'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow, DailyGameDateRow, RewardRow } from '@/types';
import { ShieldAlert, Search, UserPlus, Trash2, Award, Swords, CheckCircle2, X, Calendar } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [dailyGameDates, setDailyGameDates] = useState<DailyGameDateRow[]>([]);
  const [rewardsList, setRewardsList] = useState<RewardRow[]>([]);
  const [search, setSearch] = useState('');

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [actionModal, setModalType] = useState<'details' | 'add_player' | 'reward' | 'add_to_game' | null>(null);

  // Add player form
  const [newNick, setNewNick] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('123456');

  // Add player to game form
  const [selectedTournamentDate, setSelectedTournamentDate] = useState('');

  // Assign reward form
  const [selectedRewardTitle, setSelectedRewardTitle] = useState('');

  // Feedback messages
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        const u: PlayerRow = JSON.parse(stored);
        setCurrentUser(u);
        const role = u['Роль'];
        const isAdmin = role === 'Админ' || role === 'Владелец' || u['Админ?'] === true;
        if (!isAdmin) {
          router.push('/home');
          return;
        }
      } catch (e) {
        router.push('/login');
        return;
      }
    } else {
      router.push('/login');
      return;
    }

    Promise.all([
      fetch('/api/sheets?sheet=ИГРОКИ'),
      fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
      fetch('/api/sheets?sheet=НАГРАДЫ'),
    ])
      .then(async ([pRes, dRes, rRes]) => {
        const pJson = await pRes.json();
        const dJson = await dRes.json();
        const rJson = await rRes.json();

        if (pJson.data && Array.isArray(pJson.data)) setPlayers(pJson.data);
        if (dJson.data && Array.isArray(dJson.data)) {
          setDailyGameDates(dJson.data);
          if (dJson.data[0]) setSelectedTournamentDate(dJson.data[0]['Дата']);
        }
        if (rJson.data && Array.isArray(rJson.data)) {
          setRewardsList(rJson.data);
          if (rJson.data[0]) setSelectedRewardTitle(rJson.data[0]['Название']);
        }
      })
      .catch((err) => console.error(err));
  }, [router]);

  const role = currentUser?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || currentUser?.['Админ?'] === true;
  if (!isAdminOrOwner) return null;

  const filteredPlayers = players.filter(
    (p) =>
      p['Ник']?.toLowerCase().includes(search.toLowerCase()) ||
      p['Имя']?.toLowerCase().includes(search.toLowerCase())
  );

  // Filter daily game dates where registration deadline > now (or future dates)
  const availableGameDates = dailyGameDates.filter((g) => {
    const deadlineStr = (g as any)['Дата окончания регистрации'] || g['Дата'];
    if (!deadlineStr) return true;
    const deadline = new Date(deadlineStr);
    return isNaN(deadline.getTime()) || deadline.getTime() > Date.now();
  });

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newNick.trim()) return;

    // Check uniqueness before adding to "Игроки"
    const exists = players.some(
      (p) => p['Ник']?.trim().toLowerCase() === newNick.trim().toLowerCase()
    );
    if (exists) {
      setFormError('Игрок с таким никнеймом уже существует!');
      return;
    }

    try {
      const createdPlayer: PlayerRow = {
        'Ник': newNick.trim(),
        'Пароль': newPassword,
        'Имя': newName.trim(),
        'Роль': 'Игрок',
        'Email': newEmail.trim() || `${newNick.trim().toLowerCase()}@baza.ru`,
        'Аватар': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        'Бан': false,
        'Авторизован?': true,
        'Общий рейтинг': 1000,
        'Статус': 'ИГРОК',
        'Номер телефона': newPhone,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ИГРОКИ',
          action: 'append',
          rowData: createdPlayer,
        }),
      });

      setPlayers((prev) => [...prev, createdPlayer]);
      setMessage('Игрок успешно добавлен!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setNewNick('');
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewPassword('123456');
      }, 1200);
    } catch (err) {
      console.error(err);
      setFormError('Ошибка при добавлении игрока');
    }
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ИГРОКИ',
          action: 'delete',
          keyValue: selectedPlayer['Ник'],
        }),
      });

      setPlayers((prev) => prev.filter((p) => p['Ник'] !== selectedPlayer['Ник']));
      setMessage('Игрок удален!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setSelectedPlayer(null);
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !currentUser || !selectedRewardTitle) return;
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'НАЧИСЛЕНИЕ НАГРАД',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Название': selectedRewardTitle,
            'Кто выбил': currentUser['Ник'],
            'Дата': new Date().toISOString().split('T')[0],
          },
        }),
      });

      setMessage('Награда начислена!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setSelectedPlayer(null);
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !selectedTournamentDate) return;
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: {
            'Дата': selectedTournamentDate,
            'Ник': selectedPlayer['Ник'],
            'Рейтинг': selectedPlayer['Общий рейтинг'] || 1000,
            'Баунти': 0,
            'Место': '-',
            'Начислено': 0,
            'Стоимость': 3000,
            'Номер телефона': selectedPlayer['Номер телефона'] || '',
            'Почта': selectedPlayer['Email'] || `${selectedPlayer['Ник']}@baza.ru`,
            'Статус': 'Зарегистрирован',
            'Имя': selectedPlayer['Имя'],
          },
        }),
      });

      setMessage('Игрок добавлен на игру!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setSelectedPlayer(null);
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Панель Администратора / Владельца</h1>
              <p className="text-xs text-muted-foreground">Управление игроками, назначениями на игры и наградами</p>
            </div>
          </div>

          <button
            onClick={() => {
              setModalType('add_player');
              setFormError('');
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-sm transition min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Добавить игрока</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск игрока по нику..."
              className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            />
          </div>
          <span className="text-xs text-muted-foreground">Найдено: {filteredPlayers.length} игроков</span>
        </div>

        {/* Players List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedPlayer(player);
                setModalType('details');
              }}
              className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm hover:border-brand cursor-pointer transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={player['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={player['Ник']}
                  className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                />
                <div>
                  <h3 className="font-bold text-foreground text-sm">{player['Ник']}</h3>
                  <p className="text-xs text-muted-foreground">{player['Имя']}</p>
                </div>
              </div>
              <StatusBadge status={player['Статус'] || 'ИГРОК'} />
            </div>
          ))}
        </div>

        {/* Modal Manager */}
        {actionModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
              <button
                onClick={() => {
                  setModalType(null);
                  setSelectedPlayer(null);
                  setMessage('');
                  setFormError('');
                }}
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
                  {/* Add Player Modal */}
                  {actionModal === 'add_player' && (
                    <form onSubmit={handleAddPlayer} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Нового Игрока</h3>

                      {formError && (
                        <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 text-xs rounded-lg">
                          {formError}
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Никнейм *</label>
                        <input
                          type="text"
                          required
                          value={newNick}
                          onChange={(e) => setNewNick(e.target.value)}
                          placeholder="PokerMaster"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Пароль *</label>
                        <input
                          type="text"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Имя и Фамилия</label>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Иван Петров"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Телефон</label>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="+7 (999) 000-00-00"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Email</label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="user@baza.ru"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Сохранить игрока
                      </button>
                    </form>
                  )}

                  {/* Player Card Details Modal */}
                  {actionModal === 'details' && selectedPlayer && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 border-b border-border pb-4">
                        <img
                          src={selectedPlayer['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={selectedPlayer['Ник']}
                          className="w-16 h-16 rounded-2xl object-cover border border-brand"
                        />
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{selectedPlayer['Ник']}</h3>
                          <p className="text-xs text-muted-foreground">{selectedPlayer['Имя']} • {selectedPlayer['Номер телефона'] || 'Телефон не указан'}</p>
                          <span className="inline-block mt-1">
                            <StatusBadge status={selectedPlayer['Статус'] || 'ИГРОК'} />
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-2">
                        <button
                          onClick={() => setModalType('reward')}
                          className="w-full py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-bold rounded-xl border border-purple-500/30 flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <Award className="w-4 h-4" /> Начислить награду
                        </button>
                        <button
                          onClick={() => setModalType('add_to_game')}
                          className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl border border-emerald-500/30 flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <Swords className="w-4 h-4" /> Добавить на игру
                        </button>
                        <button
                          onClick={handleDeletePlayer}
                          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl border border-rose-500/30 flex items-center justify-center gap-2 min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4" /> Удалить игрока
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Assign Reward Form with Dropdown from 'Награды' */}
                  {actionModal === 'reward' && selectedPlayer && (
                    <form onSubmit={handleAssignReward} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Начислить Награду: {selectedPlayer['Ник']}</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Выберите Награду</label>
                        <select
                          value={selectedRewardTitle}
                          onChange={(e) => setSelectedRewardTitle(e.target.value)}
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        >
                          {rewardsList.map((rew, idx) => (
                            <option key={idx} value={rew['Название']}>
                              {rew['Название']}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Подтвердить награду
                      </button>
                    </form>
                  )}

                  {/* Add To Game Form with Dropdown from 'Даты ежедневных игр' */}
                  {actionModal === 'add_to_game' && selectedPlayer && (
                    <form onSubmit={handleAddToGame} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить на Турнир: {selectedPlayer['Ник']}</h3>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-brand" /> Выберите Турнир / Дату
                        </label>
                        <select
                          value={selectedTournamentDate}
                          onChange={(e) => setSelectedTournamentDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                        >
                          {(availableGameDates.length > 0 ? availableGameDates : dailyGameDates).map((game, idx) => (
                            <option key={idx} value={game['Дата']}>
                              {game['Дата']} — {game['Название'] || 'Ежедневная Игра'}
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
