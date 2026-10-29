'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow, DailyGameDateRow, RewardRow, formatRussianDate } from '@/types';
import { checkNicknameUniqueness } from '@/lib/calculations';
import { useRequireSession } from '@/lib/useRequireSession';
import { isClubAdmin } from '@/lib/permissions';
import { ShieldAlert, Search, UserPlus, Trash2, Award, Swords, CheckCircle2, X, Calendar, ArrowUpDown } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type SortMode = 'rating_desc' | 'rating_asc' | 'alphabet' | 'champions';

export default function AdminPage() {
  const router = useRouter();
  const { user: currentUser, loading: sessionLoading } = useRequireSession({ adminOnly: true });
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [dailyGameDates, setDailyGameDates] = useState<DailyGameDateRow[]>([]);
  const [rewardsList, setRewardsList] = useState<RewardRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('rating_desc');

  useEffect(() => {
    const savedSort = localStorage.getItem('admin_players_sort');
    if (savedSort && ['rating_desc', 'rating_asc', 'alphabet', 'champions'].includes(savedSort)) {
      setSortMode(savedSort as SortMode);
    }
  }, []);

  const handleSortChange = (newSort: SortMode) => {
    setSortMode(newSort);
    localStorage.setItem('admin_players_sort', newSort);
  };

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [actionModal, setModalType] = useState<'details' | 'add_player' | 'reward' | 'add_to_game' | null>(null);

  useEffect(() => {
    if (actionModal) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [actionModal]);

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
    if (currentUser) {
      Promise.all([
        fetch('/api/sheets?sheet=Игроки'),
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
    }
  }, [currentUser]);

  if (sessionLoading || !currentUser) {
    return (
      <AppLayout>
        <LoadingSpinner text="Проверка прав администратора…" />
      </AppLayout>
    );
  }

  const isAdminOrOwner = isClubAdmin(currentUser);

  const filteredPlayers = players.filter(
    (p) =>
      p['Ник']?.toLowerCase().includes(search.toLowerCase()) ||
      p['Имя']?.toLowerCase().includes(search.toLowerCase())
  );

  const regularPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortMode === 'rating_desc') {
      return (Number(b['Общий рейтинг']) || 0) - (Number(a['Общий рейтинг']) || 0);
    }
    if (sortMode === 'rating_asc') {
      return (Number(a['Общий рейтинг']) || 0) - (Number(b['Общий рейтинг']) || 0);
    }
    if (sortMode === 'alphabet') {
      return String(a['Ник'] || '').localeCompare(String(b['Ник'] || ''), 'ru');
    }
    if (sortMode === 'champions') {
      const isChampA = String(a['Статус'] || '').includes('ЧЕМПИОН') || String(a['Место'] || '') === '1';
      const isChampB = String(b['Статус'] || '').includes('ЧЕМПИОН') || String(b['Место'] || '') === '1';
      if (isChampA && !isChampB) return -1;
      if (!isChampA && isChampB) return 1;
      return (Number(b['Общий рейтинг']) || 0) - (Number(a['Общий рейтинг']) || 0);
    }
    return 0;
  });

  const groupedPlayers = regularPlayers.reduce((acc, player) => {
    const statusKey = player['Статус'] || '👤';
    if (!acc[statusKey]) acc[statusKey] = [];
    acc[statusKey].push(player);
    return acc;
  }, {} as Record<string, PlayerRow[]>);

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

    const isUnique = checkNicknameUniqueness(newNick, players);
    if (!isUnique) {
      setFormError('Игрок с таким никнеймом уже существует!');
      return;
    }

    try {
      const userId = `p_${Date.now()}`;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const resultPageUrl = `${baseUrl}/results?playerId=${encodeURIComponent(userId)}&nick=${encodeURIComponent(newNick.trim())}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(resultPageUrl)}`;

      const createdPlayer: PlayerRow = {
        'Ник': newNick.trim(),
        'Пароль': newPassword,
        'Имя': newName.trim(),
        'Роль': '',
        'Email': newEmail.trim() || `${newNick.trim().toLowerCase()}@baza.ru`,
        'Аватар': '',
        'Бан': false,
        'Авторизован?': true,
        'Telegram ID': '',
        'Анимация?': true,
        'Админ?': false,
        'User ID': userId,
        'Общий рейтинг': 1000,
        'Статус': '👤',
        'Место': 99,
        'QR': qrUrl,
        'QR URL': qrUrl,
        'Онлайн': true,
        'Играет?': false,
        'Авторизация шаги': '3/3',
        'Соглашение о правилах': true,
        'Выбранный сезон': 'Текущий',
        'Номер телефона': newPhone,
        'Выбранный Игрок': newNick.trim(),
        'Администрация': '',
        '🔒 Row ID': `row_${userId}`,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Игроки',
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
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Игроки',
          action: 'delete',
          keyName: 'Ник',
          keyValue: selectedPlayer['Ник'],
        }),
      });

      const data = await res.json();
      if (data.success && data.deletedCount !== 0) {
        setPlayers((prev) => prev.filter((p) => p['Ник'] !== selectedPlayer['Ник']));
        setMessage('Игрок удален!');
        setTimeout(() => {
          setMessage('');
          setModalType(null);
          setSelectedPlayer(null);
        }, 1200);
      } else {
        alert(data.error || 'Запись не найдена и не удалена');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении игрока');
    }
  };

  const handleRoleChange = async (targetPlayer: PlayerRow, selectedRole: string) => {
    const currentIsAdmin = isClubAdmin(targetPlayer);
    const targetIsAdmin = selectedRole === 'Администратор';

    // If current admin status matches selected role status, do not make an unnecessary write
    if (currentIsAdmin === targetIsAdmin) {
      return;
    }

    const valueToWrite = targetIsAdmin ? 'TRUE' : '';
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Игроки',
          action: 'update',
          keyName: 'Ник',
          keyValue: targetPlayer['Ник'],
          rowData: { 'Роль': valueToWrite },
          userRole: currentUser?.['Роль'] || '',
          isAdmin: isAdminOrOwner,
        }),
      });

      setPlayers((prev) =>
        prev.map((p) => (p['Ник'] === targetPlayer['Ник'] ? { ...p, 'Роль': valueToWrite } : p))
      );
      setMessage(`Роль игрока ${targetPlayer['Ник']} изменена на: ${selectedRole || 'Игрок'}`);
      setTimeout(() => setMessage(''), 1500);
    } catch (err) {
      console.error(err);
      alert('Ошибка при изменении роли');
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
          sheetName: 'Начисление наград',
          action: 'append',
          rowData: {
            'Ник': selectedPlayer['Ник'],
            'Название': selectedRewardTitle,
            'Количество': 1,
            'Дата и время': new Date().toISOString(),
            'Описание': `Начислено администратором ${currentUser['Ник']}`,
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
    
    const tournament = dailyGameDates.find(g => g['Дата'] === selectedTournamentDate);
    const formattedDate = tournament ? (tournament['Дата'] || tournament['Дата и Время']) : selectedTournamentDate;

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: {
            'Дата': formattedDate,
            'Ник': selectedPlayer['Ник'],
            'Имя': selectedPlayer['Имя'],
            'Номер телефона игрока': selectedPlayer['Номер телефона'] || '',
            'Почта игрока': selectedPlayer['Email'] || `${selectedPlayer['Ник']}@baza.ru`,
            'Стоимость': 3000,
            'Статус': 'Ожидает',
            'Место': '',
            'Начислено': 0,
            'Вышел?': false,
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
              <p className="text-xs text-muted-foreground">
                Администратор: <strong className="text-foreground">{currentUser?.['Имя'] || currentUser?.['Ник']}</strong> ({currentUser?.['Email'] || `${currentUser?.['Ник']}@baza.ru`})
              </p>
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

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
              <select
                value={sortMode}
                onChange={(e) => handleSortChange(e.target.value as SortMode)}
                className="w-full sm:w-auto px-3 py-2 bg-muted border border-border rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
              >
                <option value="rating_desc">по рейтингу ↓ (по умолчанию)</option>
                <option value="rating_asc">по рейтингу ↑</option>
                <option value="alphabet">по алфавиту (Ник)</option>
                <option value="champions">сначала чемпионы/лидеры</option>
              </select>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Найдено: {regularPlayers.length} игроков</span>
        </div>

        {/* Players Grouped By Status */}
        <div className="space-y-6">
          {Object.keys(groupedPlayers).length === 0 ? (
            <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-sm">
              Игроки не найдены.
            </div>
          ) : (
            Object.entries(groupedPlayers).map(([statusGroup, groupList]) => (
              <div key={statusGroup} className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <StatusBadge status={statusGroup} />
                  <span className="text-xs text-muted-foreground">({groupList.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupList.map((player, idx) => {
                    const playerRole = player['Роль'] || '';

                    return (
                      <div
                        key={idx}
                        className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm hover:border-brand transition flex flex-col justify-between"
                      >
                        <div
                          onClick={() => {
                            router.push(`/club-register?nick=${encodeURIComponent(player['Ник'])}`);
                          }}
                          className="flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {player['Аватар'] ? (
                              <img
                                src={player['Аватар']}
                                alt={player['Ник']}
                                className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-muted border border-border text-brand font-bold text-base flex items-center justify-center shrink-0">
                                {player['Ник']?.[0]?.toUpperCase() || 'P'}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-foreground text-sm">{player['Ник']}</h3>
                              <p className="text-xs text-muted-foreground">{player['Имя']}</p>
                              <span className="text-[10px] text-brand font-semibold">
                                Рейтинг: {player['Общий рейтинг'] || 0}
                              </span>
                            </div>
                          </div>
                          <StatusBadge status={player['Статус'] || '👤'} />
                        </div>

                        {/* Role Management Dropdown */}
                        <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground font-semibold">Роль:</span>
                          {playerRole === 'Владелец' ? (
                            <span className="font-bold text-amber-400 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                              Владелец
                            </span>
                          ) : (
                            <select
                              value={isClubAdmin(player) ? 'Администратор' : ''}
                              onChange={(e) => handleRoleChange(player, e.target.value)}
                              className="px-2 py-1 bg-muted border border-border rounded text-foreground text-xs font-bold focus:outline-none focus:ring-1 focus:ring-brand min-h-[34px]"
                            >
                              <option value="">Игрок</option>
                              <option value="Администратор">Администратор</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Manager */}
        {actionModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-y-contain">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[85dvh] overflow-y-auto overscroll-y-contain pb-[calc(2rem+env(safe-area-inset-bottom))]">
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
                        {selectedPlayer['Аватар'] ? (
                          <img
                            src={selectedPlayer['Аватар']}
                            alt={selectedPlayer['Ник']}
                            className="w-16 h-16 rounded-2xl object-cover border border-brand"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-muted border border-brand text-brand font-black text-xl flex items-center justify-center shrink-0">
                            {selectedPlayer['Ник']?.[0]?.toUpperCase() || 'P'}
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{selectedPlayer['Ник']}</h3>
                          <p className="text-xs text-muted-foreground">{selectedPlayer['Имя']} • {selectedPlayer['Номер телефона'] || 'Телефон не указан'}</p>
                          <span className="inline-block mt-1">
                            <StatusBadge status={selectedPlayer['Статус'] || '👤'} />
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

                  {/* Assign Reward Form */}
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

                  {/* Add To Game Form */}
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
                              {formatRussianDate(game['Дата'])} — {game['Название'] || 'Ежедневная Игра'}
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
