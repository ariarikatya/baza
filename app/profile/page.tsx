'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { Player, TournamentRecord } from '@/types';
import { Share2, LogOut, Trophy, Award, DollarSign, Swords } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Player | null>(null);
  const [userHistory, setUserHistory] = useState<TournamentRecord[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (!stored) {
      router.push('/login');
      return;
    }

    const parsedUser: Player = JSON.parse(stored);
    setUser(parsedUser);

    // Fetch tournament history for user
    fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const filtered = json.data.filter(
            (r: TournamentRecord) =>
              r.playerId === parsedUser.id || r.playerNickname === parsedUser.nickname
          );
          setUserHistory(filtered);
        }
      })
      .catch((err) => console.error(err));
  }, [router]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/profile?id=${user?.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Профиль игрока ${user?.nickname} - ПК БАЗА`,
          url: shareUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('baza_user');
    router.push('/login');
  };

  if (!user) return null;

  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile?id=${user.id}` : '';

  const columns = [
    { header: 'Турнир', accessor: 'tournamentName' as keyof TournamentRecord },
    { header: 'Дата', accessor: 'date' as keyof TournamentRecord },
    {
      header: 'Место',
      accessor: (r: TournamentRecord) => (
        <span className="font-bold text-amber-400">#{r.place}</span>
      ),
    },
    { header: 'Очки', accessor: 'points' as keyof TournamentRecord },
    {
      header: 'Призовые',
      accessor: (r: TournamentRecord) => `${r.prizeMoney ? r.prizeMoney.toLocaleString() : 0} ₽`,
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <div className="relative">
              <img
                src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={user.nickname}
                className="w-28 h-28 rounded-2xl object-cover border-2 border-brand shadow-lg"
              />
              <span className="absolute -bottom-2 -right-2">
                <StatusBadge status={user.status} />
              </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{user.nickname}</h1>
                <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
                  {user.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user.fullName} • {user.phone}</p>
              <p className="text-xs text-muted-foreground">В клубе с: {user.registeredAt}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-sm font-medium transition-colors min-h-[44px]"
              >
                <Share2 className="w-4 h-4 text-brand" />
                <span>{copied ? 'Скопировано!' : 'Поделиться'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Рейтинг</p>
              <p className="text-xl font-bold text-foreground">{user.rating || 1000}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Побед</p>
              <p className="text-xl font-bold text-foreground">{user.winsCount || 0}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Сыграно игр</p>
              <p className="text-xl font-bold text-foreground">{user.gamesPlayed || 0}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Призовые</p>
              <p className="text-xl font-bold text-foreground">
                {(user.totalPrizes || 0).toLocaleString()} ₽
              </p>
            </div>
          </div>
        </div>

        {/* QR Code and Game History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QRCodeDisplay
              value={profileUrl || user.id}
              label={`QR-код игрока ${user.nickname}`}
            />
          </div>
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">История турниров</h3>
            <DataTable
              columns={columns}
              data={userHistory}
              pageSize={5}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
