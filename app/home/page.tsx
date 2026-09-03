'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow, ClubRow, DailyGameDateRow, InClubRow, PlayerRow, formatRussianDate } from '@/types';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { 
  Sparkles, Phone, MessageSquare, Utensils, Bell, Calendar, Users, 
  CheckCircle, Smartphone, Edit3, X, PlusCircle, Trash2, Edit, 
  Trophy, ArrowRight, Flame, Clock, MapPin, Star, Zap, Crown
} from 'lucide-react';

const DEFAULT_LOGO = 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';
const MENU_URL = 'https://menusa.app/11f1073fcd3e357d82735ac1e34de2ec';
const TELEGRAM_TOURNAMENTS_URL = 'https://t.me/baza6464';
const TELEGRAM_SUPPORT_URL = 'https://t.me/Baza380215';

export default function HomePage() {
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [clubInfo, setClubInfo] = useState<ClubRow | null>(null);
  const [upcomingTournament, setUpcomingTournament] = useState<DailyGameDateRow | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(0);
  const [inClubPlayers, setInClubPlayers] = useState<InClubRow[]>([]);
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [logoUpdating, setLogoUpdating] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<PromotionRow | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionRow | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoStartDate, setPromoStartDate] = useState('');
  const [promoEndDate, setPromoEndDate] = useState('');
  const [promoImage, setPromoImage] = useState('');
  const [promoUploading, setPromoUploading] = useState(false);
  const [promoSubmitting, setPromoSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { console.error(e); }
    }

    async function fetchData() {
      try {
        const [promRes, clubRes, datesRes, gamesRes, inClubRes] = await Promise.all([
          fetch('/api/sheets?sheet=АКЦИИ'),
          fetch('/api/sheets?sheet=КЛУБ'),
          fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
          fetch('/api/sheets?sheet=🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'),
          fetch('/api/sheets?sheet=В КЛУБЕ'),
        ]);

        const promData = await promRes.json();
        const clubData = await clubRes.json();
        const datesData = await datesRes.json();
        const gamesData = await gamesRes.json();
        const inClubData = await inClubRes.json();

        if (promData.data) setPromotions(promData.data);
        if (clubData.data && clubData.data.length > 0) {
          setClubInfo(clubData.data[0]);
          if (clubData.data[0]['Логотип']) setNewLogoUrl(clubData.data[0]['Логотип']);
        }

        if (datesData.data && Array.isArray(datesData.data)) {
          const tournaments = datesData.data;
          const now = new Date();
          const activeTournaments = tournaments
            .filter((t: any) => {
              const gameDate = new Date(t['Дата и Время'] || t['Дата']);
              const regDeadline = new Date(t['Дата окончания регистрации'] || t['Дата и Время'] || t['Дата']);
              return gameDate > now && regDeadline > now;
            })
            .sort((a: any, b: any) => 
              new Date(a['Дата и Время'] || a['Дата']).getTime() - 
              new Date(b['Дата и Время'] || b['Дата']).getTime()
            );

          const upcoming = activeTournaments[0] || null;
          setUpcomingTournament(upcoming);

          if (upcoming && gamesData.data && Array.isArray(gamesData.data)) {
            const upcomingDate = (upcoming['Дата'] || upcoming['Дата и Время'] || '').split(' ')[0];
            const count = gamesData.data.filter((g: any) => {
              const gDate = (g['Дата'] || '').split(' ')[0];
              return gDate === upcomingDate;
            }).length;
            setRegisteredCount(count);
          }
        }

        if (inClubData.data && Array.isArray(inClubData.data)) {
          const todayStr = new Date().toISOString().split('T')[0];
          const activePlayers = inClubData.data.filter((p: InClubRow) =>
            Boolean(p['Дата']?.startsWith(todayStr)) &&
            (!p['Вышел сегодня'] || String(p['Вышел сегодня']).toLowerCase() === 'false')
          );
          setInClubPlayers(activePlayers);
        }
      } catch (err) {
        console.error('Failed to load home page data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const role = user?.['Роль'];
  const isAdminOrOwner = role === 'Админ' || role === 'Владелец' || user?.['Админ?'] === true;

  const handleUpdateLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogoUrl.trim() || !clubInfo) return;
    setLogoUpdating(true);
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'КЛУБ',
          action: 'update',
          keyName: 'Название',
          keyValue: clubInfo['Название'] || 'БАЗА',
          rowData: { ...clubInfo, 'Логотип': newLogoUrl.trim() },
        }),
      });
      setClubInfo((prev) => (prev ? { ...prev, 'Логотип': newLogoUrl.trim() } : null));
      setIsLogoModalOpen(false);
    } catch (err) {
      console.error('Failed to update logo:', err);
    } finally {
      setLogoUpdating(false);
    }
  };

  const handleQuickRegister = async () => {
    if (!user || !upcomingTournament || registering) return;
    setRegistering(true);
    setRegSuccess(false);

    try {
      const regRes = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: {
            'Дата': upcomingTournament['Дата'] || upcomingTournament['Дата и Время'],
            'Ник': user['Ник'],
            'Номер телефона': user['Номер телефона'] || '',
            'Почта': user['Email'] || `${user['Ник']}@baza.ru`,
            'Почта игрока': user['Email'] || `${user['Ник']}@baza.ru`,
            'Стоимость': upcomingTournament['Стоимость'] || upcomingTournament['Банк рейтинга'] || 3000,
            'Статус': 'Ожидает',
            'Имя': user['Имя'] || user['Ник'],
          },
        }),
      });
      console.log('Tournament reg result:', await regRes.json());

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'В КЛУБЕ',
          action: 'append',
          rowData: {
            'Дата': new Date().toISOString().split('T')[0],
            'Ник': user['Ник'],
            'Время входа': new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            'Статус': 'Ожидает',
            'Имя': user['Имя'] || user['Ник'],
            'Email': user['Email'] || `${user['Ник']}@baza.ru`,
            'Подтвержден?': false,
            'Аватар': user['Аватар'] || '',
          },
        }),
      });

      setRegisteredCount((prev) => prev + 1);
      setRegSuccess(true);
    } catch (err) {
      console.error('Quick register failed:', err);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ===== HERO SECTION ===== */}
        <div className="relative overflow-hidden rounded-3xl border border-[#014373]/30 bg-gradient-to-br from-[#0a0f1e] via-[#0d1a33] to-[#014373]/30 p-6 md:p-10 shadow-2xl">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#014373]/20 rounded-full blur-3xl -z-0" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-0" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Logo */}
            <div className="relative group shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-[#014373]/40 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <img
                  src={clubInfo?.['Логотип'] || DEFAULT_LOGO}
                  alt="БАЗА"
                  className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl border-2 border-[#014373]/60 object-cover shadow-2xl"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
                />
                <div className="absolute -bottom-2 -right-2 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  ON AIR
                </div>
              </div>
              {isAdminOrOwner && (
                <button
                  onClick={() => setIsLogoModalOpen(true)}
                  className="absolute -top-1 -right-1 p-1.5 bg-gray-900/90 hover:bg-gray-800 text-white rounded-lg border border-gray-700 transition"
                  title="Изменить логотип"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Text content */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-[#014373]/40 text-sky-300 border border-[#014373]/50 text-[11px] font-bold uppercase tracking-wider">
                  Премиум Покерный Клуб
                </span>
                {inClubPlayers.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[11px] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    За столами: {inClubPlayers.length}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black mb-2 tracking-tight">
                  <span className="bg-gradient-to-r from-white via-slate-200 to-gray-400 bg-clip-text text-transparent">
                    Покерный Клуб
                  </span>
                  <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent"> "БАЗА"</span>
                </h1>
                <p className="text-gray-400 text-sm md:text-base max-w-xl leading-relaxed">
                  {clubInfo?.['О клубе'] || 'Ежедневные турниры, прозрачный рейтинг и атмосфера честной игры.'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2.5 pt-1">
                <Link
                  href="/tournaments"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl transition shadow-lg shadow-[#014373]/30 text-sm min-h-[42px]"
                >
                  <Calendar className="w-4 h-4" />
                  Расписание
                </Link>
                <Link
                  href="/rating"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm min-h-[42px]"
                >
                  <Trophy className="w-4 h-4" />
                  Рейтинг
                </Link>
                <a
                  href={MENU_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700/50 transition text-sm min-h-[42px]"
                >
                  <Utensils className="w-4 h-4 text-amber-400" />
                  Меню
                </a>
                <a
                  href={TELEGRAM_TOURNAMENTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold rounded-xl transition text-sm min-h-[42px]"
                >
                  <Bell className="w-4 h-4" />
                  Telegram
                </a>
                <button
                  onClick={() => setIsPwaModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl border border-gray-700/50 transition text-sm min-h-[42px]"
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  PWA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== UPCOMING TOURNAMENT ===== */}
        {upcomingTournament && (
          <div className="relative overflow-hidden rounded-2xl border border-[#014373]/30 bg-gradient-to-r from-[#0a0f1e] to-[#0d1a33] p-6 shadow-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-[#014373] to-[#013357] rounded-xl shadow-lg shadow-[#014373]/30">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Ближайший турнир</span>
                  <h3 className="text-lg md:text-xl font-bold text-white mt-0.5">
                    {formatRussianDate(upcomingTournament['Дата'] || upcomingTournament['Дата и Время'])}
                  </h3>
                  {(upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание']) && (
                    <p className="text-xs text-gray-400 mt-1 max-w-md line-clamp-2">
                      {upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание']}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Записалось</span>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <Users className="w-4 h-4 text-[#014373]" />
                    <span className="text-lg font-bold text-white">{registeredCount}</span>
                    <span className="text-xs text-gray-500">/ 40</span>
                  </div>
                </div>

                {(() => {
                  const now = new Date();
                  const gameDateStr = upcomingTournament['Дата и Время'] || upcomingTournament['Дата'];
                  const regDeadlineStr = (upcomingTournament as any)?.['Дата окончания регистрации'] || gameDateStr;
                  const regDeadline = new Date(regDeadlineStr);
                  const playerCount = (upcomingTournament as any)?.['Кол-во игроков'] || registeredCount;

                  if (regSuccess) {
                    return (
                      <div className="px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[42px]">
                        <CheckCircle className="w-4 h-4" /> Вы в игре!
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={handleQuickRegister}
                      disabled={regDeadline < now || playerCount >= 40 || registering}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#014373] to-[#013357] hover:from-[#013357] hover:to-[#012244] text-white font-bold rounded-xl shadow-lg shadow-[#014373]/30 text-xs transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[42px] flex items-center gap-2"
                    >
                      {registering ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : regDeadline < now ? (
                        'Регистрация закрыта'
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Записаться
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ===== PLAYERS IN CLUB ===== */}
        {inClubPlayers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Сейчас за столами
              <span className="text-xs text-gray-500 font-normal">({inClubPlayers.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {inClubPlayers.map((player, pIdx) => (
                <div key={pIdx} className="bg-gray-900/60 border border-gray-800/60 p-2.5 rounded-xl flex items-center gap-2.5 hover:border-[#014373]/40 transition">
                  <img
                    src={player['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={player['Ник']}
                    className="w-8 h-8 rounded-full object-cover border border-gray-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player['Ник']}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold">{player['Статус'] || 'В игре'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CONTACTS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="tel:89616400021"
            className="flex items-center gap-3 p-4 bg-gray-900/60 border border-gray-800/60 rounded-xl hover:border-[#014373]/40 transition group"
          >
            <div className="p-2.5 bg-[#014373]/20 rounded-lg group-hover:bg-[#014373]/30 transition">
              <Phone className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Телефон</p>
              <p className="text-sm font-semibold text-white">8 961 640-00-21</p>
            </div>
          </a>
          <a
            href={TELEGRAM_SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-900/60 border border-gray-800/60 rounded-xl hover:border-sky-500/30 transition group"
          >
            <div className="p-2.5 bg-sky-500/15 rounded-lg group-hover:bg-sky-500/25 transition">
              <MessageSquare className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Поддержка</p>
              <p className="text-sm font-semibold text-sky-400">{clubInfo?.['Поддержка'] || '@Baza380215'}</p>
            </div>
          </a>
        </div>

        {/* ===== PROMOTIONS ===== */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg md:text-xl font-bold text-white">Акции и Спецпредложения</h2>
            </div>
            {isAdminOrOwner && (
              <button
                onClick={() => {
                  setEditingPromo(null);
                  setPromoTitle('');
                  setPromoDesc('');
                  setPromoStartDate('');
                  setPromoEndDate('');
                  setPromoImage('');
                  setIsPromoModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl text-xs transition shadow-md min-h-[40px]"
              >
                <PlusCircle className="w-4 h-4" />
                Добавить
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-gray-900/60 border border-gray-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              Сейчас нет активных акций
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {promotions.map((promo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPromo(promo)}
                  className="group bg-gray-900/60 border border-gray-800/60 rounded-xl overflow-hidden hover:border-[#014373]/50 transition-all duration-300 shadow-lg cursor-pointer flex flex-col"
                >
                  <div className="relative h-36 overflow-hidden bg-gray-800">
                    <img
                      src={promo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo['Название'] || 'Акция'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                    <span className="absolute top-2.5 left-2.5 bg-[#014373]/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                      {promo['Уведомление'] || 'АКЦИЯ'}
                    </span>

                    {isAdminOrOwner && (
                      <div
                        className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm p-1 rounded-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setEditingPromo(promo);
                            setPromoTitle(promo['Название'] || '');
                            setPromoDesc(promo['Описание'] || '');
                            setPromoStartDate(promo['Дата начала'] || '');
                            setPromoEndDate(promo['Дата окончания'] || '');
                            setPromoImage(promo['Картинка'] || '');
                            setIsPromoModalOpen(true);
                          }}
                          className="p-1 text-white hover:text-amber-400 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Удалить "${promo['Название']}"?`)) return;
                            try {
                              await fetch('/api/sheets', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sheetName: 'АКЦИИ',
                                  action: 'delete',
                                  keyValue: promo['Название'],
                                }),
                              });
                              setPromotions((prev) => prev.filter((p) => p['Название'] !== promo['Название']));
                            } catch (err) {
                              console.error('Delete failed:', err);
                            }
                          }}
                          className="p-1 text-white hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors line-clamp-1">
                        {promo['Название']}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-3 leading-relaxed">
                        {promo['Описание']}
                      </p>
                    </div>
                    {promo['Дата окончания'] && (
                      <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-500">
                        <span>До:</span>
                        <span className="font-medium text-gray-300">{promo['Дата окончания']}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== PWA MODAL ===== */}
      {isPwaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setIsPwaModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-sky-400" />
              Установить приложение
            </h3>
            <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <p className="font-bold text-white mb-1">iOS (Safari)</p>
                <p>1. Нажмите «Поделиться» (стрелка вверх)</p>
                <p>2. Выберите «На экран Домой»</p>
                <p>3. Нажмите «Добавить»</p>
              </div>
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <p className="font-bold text-white mb-1">Android (Chrome)</p>
                <p>1. Нажмите  в правом верхнем углу</p>
                <p>2. «Добавить на главный экран»</p>
                <p>3. Подтвердите установку</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROMO DETAIL MODAL ===== */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedPromo(null)}
              className="absolute top-4 right-4 z-10 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative h-52 bg-gray-800 shrink-0">
              <img
                src={selectedPromo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                alt={selectedPromo['Название']}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
              <span className="absolute bottom-3 left-4 bg-[#014373] text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
                {selectedPromo['Уведомление'] || 'АКЦИЯ'}
              </span>
            </div>
            <div className="space-y-3 p-5 overflow-y-auto">
              <h2 className="text-xl font-extrabold text-white">{selectedPromo['Название']}</h2>
              {(selectedPromo['Дата начала'] || selectedPromo['Дата окончания']) && (
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-400 bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                  {selectedPromo['Дата начала'] && <div>С: <span className="text-white">{selectedPromo['Дата начала']}</span></div>}
                  {selectedPromo['Дата окончания'] && <div>По: <span className="text-white">{selectedPromo['Дата окончания']}</span></div>}
                </div>
              )}
              <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{selectedPromo['Описание']}</p>
            </div>
            <div className="p-5 border-t border-gray-800 shrink-0">
              <Link
                href="/tournaments"
                onClick={() => setSelectedPromo(null)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-extrabold rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Calendar className="w-4 h-4" />
                Записаться на игру
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADMIN PROMO MODAL ===== */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsPromoModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">{editingPromo ? 'Изменить акцию' : 'Добавить акцию'}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!promoTitle.trim()) return;
                setPromoSubmitting(true);
                const rowData = {
                  'Название': promoTitle.trim(),
                  'Описание': promoDesc.trim(),
                  'Дата начала': promoStartDate,
                  'Дата окончания': promoEndDate,
                  'Уведомление': 'АКЦИЯ',
                  'Картинка': promoImage.trim(),
                };
                try {
                  if (editingPromo) {
                    await fetch('/api/sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sheetName: 'АКЦИИ',
                        action: 'update',
                        keyName: 'Название',
                        keyValue: editingPromo['Название'],
                        rowData,
                      }),
                    });
                    setPromotions((prev) => prev.map((p) => (p['Название'] === editingPromo['Название'] ? rowData : p)));
                  } else {
                    const res = await fetch('/api/sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ sheetName: 'АКЦИИ', action: 'append', rowData }),
                    });
                    console.log('Promo append result:', await res.json());
                    setPromotions((prev) => [...prev, rowData]);
                  }
                  setIsPromoModalOpen(false);
                } catch (err) {
                  console.error('Failed to save promotion:', err);
                } finally {
                  setPromoSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-gray-400">Название *</label>
                <input
                  type="text"
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[42px]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400">Описание</label>
                <textarea
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400">Дата начала</label>
                  <input type="date" value={promoStartDate} onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[42px]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400">Дата окончания</label>
                  <input type="date" value={promoEndDate} onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[42px]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400">Картинка</label>
                {promoImage && (
                  <div className="mt-2 relative h-28 rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                    <img src={promoImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setPromoUploading(true);
                    try {
                      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                      const formData = new FormData();
                      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                      if (!apiKey) throw new Error('ImgBB API key not found');
                      formData.append('image', compressed);
                      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
                      const json = await res.json();
                      if (json.data?.url) setPromoImage(json.data.url);
                    } catch (err) {
                      console.error('Image upload failed:', err);
                    } finally {
                      setPromoUploading(false);
                    }
                  }}
                  className="w-full mt-2 text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#014373] file:text-white hover:file:bg-[#013357]"
                />
                {promoUploading && <p className="text-[11px] text-amber-400 mt-1">Загрузка фото...</p>}
              </div>
              <button
                type="submit"
                disabled={promoSubmitting || promoUploading}
                className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl min-h-[42px] shadow-lg shadow-[#014373]/20 disabled:opacity-50"
              >
                {promoSubmitting ? 'Сохранение...' : editingPromo ? 'Изменить' : 'Сохранить'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===== LOGO MODAL ===== */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setIsLogoModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Изменить логотип</h3>
            <form onSubmit={handleUpdateLogo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400">URL логотипа *</label>
                <input
                  type="url"
                  required
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[42px]"
                />
              </div>
              <button
                type="submit"
                disabled={logoUpdating}
                className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl min-h-[42px] shadow-lg shadow-[#014373]/20 disabled:opacity-50"
              >
                {logoUpdating ? 'Сохранение...' : 'Обновить'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
