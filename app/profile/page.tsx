'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { PlayerRow, TournamentTableRow, DailyGameRow, formatRussianDate } from '@/types';
import { Share2, LogOut, Trophy, Award, DollarSign, Send, CheckCircle, XCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [tournamentInfo, setTournamentInfo] = useState<{
    rating: number | string;
    status: string;
    place: number | string;
  }>({
    rating: '-',
    status: 'ИГРОК',
    place: '-',
  });
  const [gameHistory, setGameHistory] = useState<DailyGameRow[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (!stored) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser: PlayerRow = JSON.parse(stored);
      setUser(parsedUser);

      // Fetch "Общий рейтинг", "Статус", and "Место" strictly from "ТУРНИРНАЯ ТАБЛИЦА" sheet by matching 'Ник'
      fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            const rowMatch = json.data.find(
              (r: TournamentTableRow) =>
                r['Ник']?.trim().toLowerCase() === parsedUser['Ник']?.trim().toLowerCase()
            );

            if (rowMatch) {
              setTournamentInfo({
                rating: rowMatch['Общий рейтинг'] !== undefined && rowMatch['Общий рейтинг'] !== '' ? rowMatch['Общий рейтинг'] : '-',
                status: rowMatch['Статус'] || 'ИГРОК',
                place: rowMatch['Место'] !== undefined && rowMatch['Место'] !== '' ? rowMatch['Место'] : '-',
              });
            }
          }
        })
        .catch((err) => console.error(err));

      // Fetch Game History strictly from "🎮 ЕЖЕДНЕВНЫЕ ИГРЫ" sheet by matching 'Ник'
      fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            const filtered = json.data.filter(
              (g: DailyGameRow) =>
                g['Ник']?.trim().toLowerCase() === parsedUser['Ник']?.trim().toLowerCase()
            ).sort((a: DailyGameRow, b: DailyGameRow) => new Date(b['Дата']).getTime() - new Date(a['Дата']).getTime());

            setGameHistory(filtered);
          }
        })
        .catch((err) => console.error(err));
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const handleShare = async () => {
    if (!user) return;
    const shareUrl = `${window.location.origin}/profile?nick=${encodeURIComponent(user['Ник'])}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Профиль игрока ${user['Ник']} - ПК БАЗА`,
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

  const handleLogout = async () => {
    if (!user) return;

    try {
      // 1. Update Google Sheets
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ИГРОКИ',
          action: 'update',
          keyName: 'Ник',
          keyValue: user['Ник'],
          rowData: {
            'Авторизован?': false,
            'Онлайн': false,
          },
        }),
      });

      // 2. Clear localStorage
      localStorage.removeItem('baza_user');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      localStorage.removeItem('baza_user');
      router.push('/login');
    }
  };

  if (!user) return null;

  const profileQrData = user['QR URL'] || user['QR'] || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://baza64.glide.page/dl/player/s/3d185a/r/${user['🔒 Row ID'] || user['Ник']}`)}`;
  const telegramId = user['Telegram ID'];
  const hasTelegram = Boolean(telegramId && String(telegramId).trim() !== '');
  const telegramBotLink = `https://t.me/baza64_bot?start=${user['Ник'] || ''}`;

  const columns = [
    {
      header: 'Дата',
      accessor: (g: DailyGameRow) => formatRussianDate(g['Дата']),
    },
    {
      header: 'Место',
      accessor: (g: DailyGameRow) => (
        <span className="font-bold text-amber-400">#{g['Место'] || '-'}</span>
      ),
    },
    {
      header: 'Начислено',
      accessor: (g: DailyGameRow) => (
        <span className="font-bold text-emerald-400">{g['Начислено'] || 0}</span>
      ),
    },
    {
      header: 'Игроков в день',
      accessor: (g: DailyGameRow) => g['Рейтинг'] || g['Стоимость'] || '-',
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
                src={user['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={user['Ник']}
                className="w-28 h-28 rounded-2xl object-cover border-2 border-brand shadow-lg"
              />
              <span className="absolute -bottom-2 -right-2">
                <StatusBadge status={tournamentInfo.status} />
              </span>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{user['Ник']}</h1>
                <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
                  {user['Роль'] || 'Игрок'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user['Имя']} • {user['Номер телефона']}</p>
              <p className="text-xs text-muted-foreground">Сезон: {user['Выбранный сезон'] || 'Текущий'}</p>
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
                onClick={() => router.push('/heraldry')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
              >
                <Award className="w-4 h-4" />
                <span>Награды</span>
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
              <p className="text-xs text-muted-foreground">Общий рейтинг</p>
              <p className="text-xl font-bold text-foreground">{tournamentInfo.rating}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Место в рейтинге</p>
              <p className="text-xl font-bold text-foreground">#{tournamentInfo.place}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Статус в клубе</p>
              <p className="text-sm font-bold text-foreground">{tournamentInfo.status}</p>
            </div>
          </div>

          {/* Telegram Status / Connect Notifications Card */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Уведомления</p>
                {hasTelegram ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Подключено
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Не подключено
                  </span>
                )}
              </div>
            </div>
            <a
              href={telegramBotLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition min-h-[44px] flex items-center gap-1.5 shadow-md shadow-sky-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{hasTelegram ? 'Подключен' : 'Подключить уведомления'}</span>
            </a>
          </div>
        </div>

        {/* QR Code and Game History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <QRCodeDisplay
              value={profileQrData}
              label={`QR-код игрока ${user['Ник']}`}
            />
          </div>
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">История игр игрока</h3>
            <DataTable
              columns={columns}
              data={gameHistory}
              pageSize={5}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
