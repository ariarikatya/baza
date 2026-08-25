'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { PlayerRow, TournamentTableRow } from '@/types';
import { Share2, LogOut, Trophy, Award, DollarSign, Send, CheckCircle, XCircle } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [userRating, setUserRating] = useState<number | string>(1000);
  const [userHistory, setUserHistory] = useState<TournamentTableRow[]>([]);
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

      // Fetch rating & history from Google Sheet "ТУРНИРНАЯ ТАБЛИЦА" matching by 'Ник'
      fetch('/api/sheets?sheet=ТУРНИРНАЯ ТАБЛИЦА')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            const rowMatch = json.data.find(
              (r: TournamentTableRow) =>
                r['Ник']?.trim().toLowerCase() === parsedUser['Ник']?.trim().toLowerCase()
            );
            if (rowMatch && rowMatch['Общий рейтинг'] !== undefined && rowMatch['Общий рейтинг'] !== '') {
              setUserRating(rowMatch['Общий рейтинг']);
            } else if (parsedUser['Общий рейтинг']) {
              setUserRating(parsedUser['Общий рейтинг']);
            }

            const filtered = json.data.filter(
              (r: TournamentTableRow) =>
                r['Ник']?.trim().toLowerCase() === parsedUser['Ник']?.trim().toLowerCase()
            );
            setUserHistory(filtered);
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

  const handleLogout = () => {
    localStorage.removeItem('baza_user');
    router.push('/login');
  };

  if (!user) return null;

  const profileQrData = user['QR URL'] || user['QR'] || user['Ник'];
  const hasTelegram = Boolean(user['Telegram ID'] && String(user['Telegram ID']).trim() !== '');

  const columns = [
    {
      header: 'Место',
      accessor: (r: TournamentTableRow) => (
        <span className="font-bold text-amber-400">#{r['Место']}</span>
      ),
    },
    { header: 'Ник', accessor: (r: TournamentTableRow) => r['Ник'] },
    { header: 'Общий рейтинг', accessor: (r: TournamentTableRow) => r['Общий рейтинг'] },
    { header: 'Баунти', accessor: (r: TournamentTableRow) => r['Баунти'] },
    { header: 'Спец.задания', accessor: (r: TournamentTableRow) => r['Спец.задания'] },
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
                <StatusBadge status={user['Статус'] || 'ИГРОК'} />
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
              <p className="text-xl font-bold text-foreground">{userRating}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Место в рейтинге</p>
              <p className="text-xl font-bold text-foreground">#{user['Место'] || '-'}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Статус в клубе</p>
              <p className="text-sm font-bold text-foreground">{user['Статус'] || 'ИГРОК'}</p>
            </div>
          </div>

          {/* Telegram Status Card */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telegram</p>
                {hasTelegram ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Подключен
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Не подключен
                  </span>
                )}
              </div>
            </div>
            {hasTelegram && (
              <a
                href={`https://t.me/${user['Telegram ID']}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition min-h-[38px] flex items-center"
              >
                Открыть
              </a>
            )}
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
            <h3 className="text-lg font-bold text-foreground mb-4">История в рейтинговой таблице</h3>
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
