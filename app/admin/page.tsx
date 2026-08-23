'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { PlayerRow } from '@/types';
import { ShieldAlert, Search, PlusCircle, Award, DollarSign, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
  const [modalType, setModalType] = useState<'result' | 'bounty' | 'reward' | null>(null);

  // Form states for modals
  const [pointsInput, setPointsInput] = useState('');
  const [bountyInput, setBountyInput] = useState('');
  const [rewardTitleInput, setRewardTitleInput] = useState('');
  const [message, setMessage] = useState('');

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

    fetch('/api/sheets?sheet=ИГРОКИ')
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) setPlayers(json.data);
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

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !modalType || !currentUser) return;

    try {
      if (modalType === 'result') {
        const addedRating = parseInt(pointsInput) || 0;
        const newRating = (Number(selectedPlayer['Общий рейтинг']) || 1000) + addedRating;

        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'ИГРОКИ',
            action: 'update',
            keyName: 'Ник',
            keyValue: selectedPlayer['Ник'],
            rowData: {
              ...selectedPlayer,
              'Общий рейтинг': newRating,
            },
          }),
        });

        setPlayers((prev) =>
          prev.map((p) =>
            p['Ник'] === selectedPlayer['Ник'] ? { ...p, 'Общий рейтинг': newRating } : p
          )
        );
      } else if (modalType === 'bounty') {
        const bountyVal = parseInt(bountyInput) || 1;
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: '💰 БАУНТИ',
            action: 'append',
            rowData: {
              'Ник': selectedPlayer['Ник'],
              'Кол-во': bountyVal,
              'Дата': new Date().toISOString().split('T')[0],
              'Кто выбил': currentUser['Ник'],
            },
          }),
        });
      } else if (modalType === 'reward') {
        await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'НАЧИСЛЕНИЕ НАГРАД',
            action: 'append',
            rowData: {
              'Ник': selectedPlayer['Ник'],
              'Название': rewardTitleInput,
              'Кто выбил': currentUser['Ник'],
              'Дата': new Date().toISOString().split('T')[0],
            },
          }),
        });
      }

      setMessage('Операция успешно выполнена!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setSelectedPlayer(null);
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Панель Администратора / Владельца</h1>
            <p className="text-xs text-muted-foreground">Управление игроками, результатами турниров и начислением наград</p>
          </div>
        </div>

        {/* Search & Actions Header */}
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
            <div key={idx} className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={player['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={player['Ник']}
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{player['Ник']}</h3>
                    <p className="text-xs text-muted-foreground">{player['Имя']}</p>
                  </div>
                </div>
                <StatusBadge status={player['Статус'] || 'ИГРОК'} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg">
                <div>Рейтинг: <span className="font-bold text-foreground">{player['Общий рейтинг'] || 1000}</span></div>
                <div>Сезон: <span className="font-bold text-foreground">{player['Выбранный сезон'] || 'Текущий'}</span></div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-border">
                <button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setModalType('result');
                  }}
                  className="px-2 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-[11px] font-semibold rounded-md border border-brand/30 flex items-center justify-center gap-1 min-h-[44px]"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Результат
                </button>
                <button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setModalType('bounty');
                  }}
                  className="px-2 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-semibold rounded-md border border-amber-500/30 flex items-center justify-center gap-1 min-h-[44px]"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Баунти
                </button>
                <button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setModalType('reward');
                  }}
                  className="px-2 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[11px] font-semibold rounded-md border border-purple-500/30 flex items-center justify-center gap-1 min-h-[44px]"
                >
                  <Award className="w-3.5 h-3.5" /> Награда
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Modal */}
        {modalType && selectedPlayer && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-foreground">
                {modalType === 'result' && `Внести результат: ${selectedPlayer['Ник']}`}
                {modalType === 'bounty' && `Добавить баунти: ${selectedPlayer['Ник']}`}
                {modalType === 'reward' && `Начислить награду: ${selectedPlayer['Ник']}`}
              </h3>

              {message ? (
                <div className="py-6 flex flex-col items-center gap-2 text-emerald-400 font-bold text-center">
                  <CheckCircle2 className="w-10 h-10" />
                  <span>{message}</span>
                </div>
              ) : (
                <form onSubmit={handleSaveAction} className="space-y-4">
                  {modalType === 'result' && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Добавить очки к рейтингу</label>
                      <input
                        type="number"
                        value={pointsInput}
                        onChange={(e) => setPointsInput(e.target.value)}
                        placeholder="Например: 50"
                        className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                      />
                    </div>
                  )}

                  {modalType === 'bounty' && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Количество выбитых игроков</label>
                      <input
                        type="number"
                        value={bountyInput}
                        onChange={(e) => setBountyInput(e.target.value)}
                        placeholder="1"
                        className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                      />
                    </div>
                  )}

                  {modalType === 'reward' && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Название Награды / Достижения</label>
                      <input
                        type="text"
                        value={rewardTitleInput}
                        onChange={(e) => setRewardTitleInput(e.target.value)}
                        placeholder="Король Блефа"
                        className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalType(null);
                        setSelectedPlayer(null);
                      }}
                      className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-xl min-h-[44px]"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-brand hover:bg-brand-light text-[#ffffff] text-sm font-semibold rounded-xl min-h-[44px]"
                    >
                      Сохранить
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
