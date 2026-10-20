'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable } from '@/components/DataTable';
import { PwaModal } from '@/components/PwaModal';
import { PlayerRow, TournamentTableRow, DailyGameRow, formatRussianDate } from '@/types';
import { getSavedUserSession, restoreUserSessionAsync, saveUserSession, clearUserSession } from '@/lib/session';
import { Share2, LogOut, Trophy, Award, Send, Smartphone } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [tournamentInfo, setTournamentInfo] = useState<{
    rating: number | string;
    status: string;
    place: number | string;
  }>({
    rating: '-',
    status: '👤',
    place: '-',
  });
  const [gameHistory, setGameHistory] = useState<DailyGameRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) {
              setPushSubscribed(true);
              // Background re-sync subscription with server
              const savedUser = getSavedUserSession();
              if (savedUser) {
                fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: savedUser['User ID'],
                    nick: savedUser['Ник'],
                    subscription: sub,
                    action: 'subscribe',
                  }),
                }).catch(() => {});
              }
            }
          });
        });
      }
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleTogglePush = async () => {
    if (!user) return;
    setPushLoading(true);

    try {
      if (pushSubscribed) {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }

        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user['User ID'],
            nick: user['Ник'],
            action: 'unsubscribe',
          }),
        });

        setPushSubscribed(false);
      } else {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          alert('Ваш браузер не поддерживает Push-уведомления');
          setPushLoading(false);
          return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission !== 'granted') {
          alert('Разрешение на отправку уведомлений не было предоставлено');
          setPushLoading(false);
          return;
        }

        await navigator.serviceWorker.register('/sw.js').catch(() => {});
        const reg = await navigator.serviceWorker.ready;

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          alert('ОШИБКА: NEXT_PUBLIC_VAPID_PUBLIC_KEY не задан в переменных окружения.');
          setPushLoading(false);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user['User ID'],
            nick: user['Ник'],
            subscription: sub,
            action: 'subscribe',
          }),
        });

        const subJson = await subRes.json();
        if (subJson.success) {
          setPushSubscribed(true);
          alert('Веб-уведомления успешно подключены!');
        } else {
          alert(`Ошибка подписки: ${subJson.error || 'Неизвестная ошибка'}`);
        }
      }
    } catch (err: any) {
      console.error('Push toggle error:', err);
      alert(`Ошибка настройки уведомлений: ${err?.message || err}`);
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    const loadProfileUser = async () => {
      let parsedUser: PlayerRow | null = getSavedUserSession();
      if (!parsedUser) {
        parsedUser = await restoreUserSessionAsync();
      }
      if (!parsedUser) {
        setSessionChecked(true);
        router.push('/login');
        return;
      }

      setUser(parsedUser);
      setSessionChecked(true);
      saveUserSession(parsedUser);

      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const expectedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/results?playerId=${encodeURIComponent(parsedUser['User ID'] || '')}&nick=${encodeURIComponent(parsedUser['Ник'] || '')}`)}`;

      const savedQr = String(parsedUser['QR URL'] || parsedUser['QR'] || '');

      const isQrValid = (() => {
        if (!savedQr || !savedQr.startsWith('http') || !savedQr.includes('/results?playerId=')) return false;
        try {
          let targetUrlStr = savedQr;
          if (savedQr.includes('data=')) {
            const urlObj = new URL(savedQr);
            const dataParam = urlObj.searchParams.get('data');
            if (dataParam) targetUrlStr = dataParam;
          }
          const innerUrl = new URL(targetUrlStr.startsWith('http') ? targetUrlStr : `https://dummy.com${targetUrlStr.startsWith('/') ? '' : '/'}${targetUrlStr}`);
          const qPlayerId = innerUrl.searchParams.get('playerId');
          const qNick = innerUrl.searchParams.get('nick');
          return qPlayerId === (parsedUser['User ID'] || '') && qNick === (parsedUser['Ник'] || '');
        } catch (e) {
          return false;
        }
      })();

      if (!isQrValid) {
        const updatedUser = {
          ...parsedUser,
          'QR': expectedQrUrl,
          'QR URL': expectedQrUrl,
        };
        setUser(updatedUser);
        saveUserSession(updatedUser);

        fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'Игроки',
            action: 'update',
            keyName: 'Ник',
            keyValue: parsedUser['Ник'],
            rowData: {
              'QR': expectedQrUrl,
              'QR URL': expectedQrUrl,
            },
          }),
        }).catch((err) => console.error('Failed to sync QR code in sheets:', err));
      }

      // Re-fetch fresh player row from 'Игроки' with cache busting to prevent stale 'Telegram ID'
      fetch(`/api/sheets?sheet=Игроки&_t=${Date.now()}`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            const freshPlayer = json.data.find(
              (p: PlayerRow) =>
                p['User ID'] === parsedUser['User ID'] ||
                p['Ник']?.trim().toLowerCase() === parsedUser['Ник']?.trim().toLowerCase()
            );
            if (freshPlayer) {
              const freshTgId = freshPlayer['Telegram ID'] || '';
              if (freshTgId) {
                localStorage.setItem('lastTelegramBind', parsedUser['User ID'] || parsedUser['Ник'] || '');
              }
              const updated = {
                ...parsedUser,
                ...freshPlayer,
                'Telegram ID': freshTgId,
              };
              setUser(updated);
              saveUserSession(updated);
            }
          }
        })
        .catch((err) => console.error('Failed to refresh user profile:', err));

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
                status: rowMatch['Статус'] || '👤',
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
        console.error('Background profile load error (session preserved):', e);
      }
    };

    loadProfileUser();
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

  const handleUnsubscribe = async () => {
    if (!user) return;
    if (!window.confirm('Отключить уведомления?')) return;

    try {
      const res = await fetch('/api/telegram/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user['User ID'],
          nick: user['Ник'],
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedUser = {
          ...user,
          'Telegram ID': '',
        };
        setUser(updatedUser);
        saveUserSession(updatedUser);
        localStorage.removeItem('lastTelegramBind');
      } else {
        alert(data.error || 'Ошибка при отключении уведомлений');
      }
    } catch (err) {
      console.error('Unsubscribe error:', err);
      alert('Не удалось отключить уведомления. Попробуйте позже.');
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

      // 2. Clear session (localStorage + cookie)
      clearUserSession();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      clearUserSession();
      router.push('/login');
    }
  };

  if (!user && !sessionChecked) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-slate-400">Загрузка профиля...</div>
      </AppLayout>
    );
  }

  if (!user) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const profileQrData = `${baseUrl}/results?playerId=${encodeURIComponent(user['User ID'] || '')}&nick=${encodeURIComponent(user['Ник'] || '')}`;

  const lastBindUserId = typeof window !== 'undefined' ? localStorage.getItem('lastTelegramBind') : null;
  const isLastBindMatch = lastBindUserId && (lastBindUserId === user['User ID'] || lastBindUserId === user['Ник']);
  const telegramConnected = Boolean((user['Telegram ID'] && String(user['Telegram ID']).trim() !== '') || isLastBindMatch);
  const telegramLink = `https://t.me/baza_64_bot?start=${encodeURIComponent(user['User ID'] || user['Ник'] || '')}`;

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
              {user['Аватар'] ? (
                <img
                  src={user['Аватар']}
                  alt={user['Ник']}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-brand shadow-lg"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl border-2 border-brand shadow-lg bg-gray-800 text-brand flex items-center justify-center font-black text-3xl">
                  {user['Ник']?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
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

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 sm:gap-3 w-full md:w-auto">
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[38px] sm:min-h-[44px] shrink-0"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand shrink-0" />
                <span className="truncate">{copied ? 'Скопировано!' : 'Поделиться'}</span>
              </button>
              <button
                onClick={() => router.push('/heraldry')}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[38px] sm:min-h-[44px] shrink-0"
              >
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Награды</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-xl text-xs sm:text-sm font-medium transition-colors min-h-[38px] sm:min-h-[44px] shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Выход</span>
              </button>
            </div>
          </div>
        </div>

        {/* Player Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 shadow-sm min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Общий рейтинг</p>
              <p className="text-base font-bold text-foreground">{tournamentInfo.rating}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2 shadow-sm min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground truncate">Место в рейтинге</p>
              <p className="text-base font-bold text-foreground">#{tournamentInfo.place}</p>
            </div>
          </div>

          {/* Telegram Status / Connect Notifications Card */}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-center gap-1.5 shadow-sm min-w-0 w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold shrink-0">
                <Send className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground truncate">Уведомления в телеграм-боте</p>
            </div>

            {telegramConnected ? (
              <button
                onClick={handleUnsubscribe}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition flex-1 text-center whitespace-normal min-h-[36px] flex items-center justify-center"
              >
                Отключить уведомления
              </button>
            ) : (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition shadow-md shadow-sky-500/20 flex-1 text-center whitespace-normal min-h-[36px] flex items-center justify-center"
              >
                Подключить уведомления
              </a>
            )}
          </div>

          {/* Web Push Notification Management Block */}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-center gap-1.5 shadow-sm min-w-0 w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center font-bold shrink-0 border border-white/5">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground truncate">
                {isStandalone ? 'Уведомления на телефон' : 'Уведомления в браузере'}
              </p>
            </div>

            {notificationPermission === 'denied' && (
              <div className="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 p-2 rounded-xl">
                ⚠️ Уведомления заблокированы в настройках браузера. Разрешите уведомления в настройках сайта.
              </div>
            )}

            {!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl space-y-1">
                <div className="font-bold text-amber-400">⚙️ Web Push не настроен</div>
                <p className="text-muted-foreground leading-tight">
                  Сгенерируйте ключи командой <code className="bg-black/30 px-1 py-0.5 rounded text-amber-300">npm run generate:vapid</code> и добавьте 3 переменные в Vercel:
                </p>
                <ul className="list-disc list-inside text-[9.5px] text-muted-foreground font-mono">
                  <li>NEXT_PUBLIC_VAPID_PUBLIC_KEY</li>
                  <li>VAPID_PRIVATE_KEY</li>
                  <li>VAPID_SUBJECT (например mailto:admin@baza.ru)</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  onClick={handleTogglePush}
                  disabled={pushLoading}
                  className={`w-full px-2 py-1.5 text-xs font-bold rounded-xl transition text-center whitespace-normal min-h-[36px] flex items-center justify-center ${
                    pushSubscribed
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-brand hover:bg-brand-light text-white shadow-md'
                  }`}
                >
                  {pushLoading ? 'Загрузка...' : pushSubscribed ? 'Отключить уведомления' : 'Подключить уведомления'}
                </button>

                {(user['Роль'] === 'Админ' || user['Роль'] === 'Владелец' || user['Админ?'] === true) && (
                  <button
                    onClick={async () => {
                      setTestPushLoading(true);
                      try {
                        const res = await fetch('/api/push/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userNick: user['Ник'] }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          alert(`Тест Push отправлен!\nВсего активных подписок: ${data.total}\nУспешно отправлено: ${data.sent}\nОшибок: ${data.failed}`);
                        } else {
                          alert(`Ошибка теста Push: ${data.error}`);
                        }
                      } catch (err: any) {
                        console.error('Push test error:', err);
                        alert('Ошибка при выполнении теста Push');
                      } finally {
                        setTestPushLoading(false);
                      }
                    }}
                    disabled={testPushLoading}
                    className="w-full px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-lg transition min-h-[30px] flex items-center justify-center"
                  >
                    {testPushLoading ? 'Отправка...' : '🧪 Тест push (Админ)'}
                  </button>
                )}
              </div>
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
            <h3 className="text-lg font-bold text-foreground mb-4">История игр игрока</h3>
            <DataTable
              columns={columns}
              data={gameHistory}
              pageSize={5}
            />
          </div>
        </div>
      </div>

      {/* PWA Modal */}
      <PwaModal isOpen={isPwaModalOpen} onClose={() => setIsPwaModalOpen(false)} />
    </AppLayout>
  );
}
