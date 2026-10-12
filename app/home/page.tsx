'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow, ClubRow, DailyGameDateRow, InClubRow, PlayerRow, formatRussianDate } from '@/types';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { 
  Sparkles, Phone, MessageSquare, Utensils, Bell, Calendar, Users, 
  CheckCircle, Smartphone, Edit3, X, PlusCircle, Trash2, Edit, 
  Flame, Zap
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

  // Promotions tab state: 'active' | 'past'
  const [promoTab, setPromoTab] = useState<'active' | 'past'>('active');

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

  // Robust date parser supporting DD.MM.YYYY, DD.MM.YYYY HH:mm, ISO YYYY-MM-DD
  const parsePromoDate = (dateStr?: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // First check explicit DD.MM.YYYY or DD.MM.YYYY HH:mm format to prevent MM.DD.YYYY swapping
    const parts = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const year = parseInt(parts[3], 10);
      const hours = parts[4] !== undefined ? parseInt(parts[4], 10) : 23;
      const minutes = parts[5] !== undefined ? parseInt(parts[5], 10) : 59;
      const d = new Date(year, month, day, hours, minutes, 59, 999);
      if (!isNaN(d.getTime())) return d;
    }

    // Fallback ISO/Standard parse
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) return isoDate;

    return null;
  };

  // Filter promotions: active promotions must have end date >= today (end of day).
  // If parsing fails or date is invalid, consider it inactive (not shown in active).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const isPromoActive = (p: PromotionRow) => {
    const rawEndDate = p['Дата окончания'];
    if (!rawEndDate) return true; // if no end date specified, treat as active

    const endDate = parsePromoDate(rawEndDate);
    if (!endDate) return false; // invalid format -> treat as NOT active

    // Active if end date is today or in future (until 23:59:59 of end date)
    const endOfDay = new Date(endDate);
    if (!rawEndDate.includes(':')) {
      endOfDay.setHours(23, 59, 59, 999);
    }

    return endOfDay >= todayStart;
  };

  const activePromotions = promotions.filter(isPromoActive);
  const pastPromotions = promotions.filter((p) => !isPromoActive(p));
  const displayedPromotions = promoTab === 'active' ? activePromotions : pastPromotions;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* ===== FIRST SCREEN: TOP ACTION BLOCK & CONTACTS + BANNER ===== */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-5 md:p-8 shadow-2xl transition-all duration-300 hover:border-[#014373]/40 space-y-6">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#014373]/25 rounded-full blur-3xl pointer-events-none -z-0" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

          {/* Top Row: Main Buttons & Integrated Contacts (First Screen Priority) */}
          <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-4 justify-between">
            {/* Quick Navigation Buttons Block */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <a
                href={MENU_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-800/90 to-slate-800/50 hover:from-slate-700/90 hover:to-slate-700/60 text-white font-semibold rounded-2xl border border-white/10 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[48px] text-sm"
              >
                <Utensils className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Меню</span>
              </a>
              <a
                href={TELEGRAM_TOURNAMENTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-semibold rounded-2xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[48px] text-sm"
              >
                <Bell className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Telegram</span>
              </a>
              <button
                onClick={() => setIsPwaModalOpen(true)}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/70 hover:bg-slate-700/80 text-slate-200 font-semibold rounded-2xl border border-white/10 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[48px] text-sm"
              >
                <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                <span>PWA</span>
              </button>
            </div>

            {/* Clickable Contacts Block (Integrated alongside buttons in top screen) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-96 shrink-0">
              <a
                href="tel:89616400021"
                className="flex items-center gap-3 p-3 bg-slate-800/60 border border-white/10 rounded-2xl hover:border-[#014373]/50 transition-all group backdrop-blur-md min-h-[48px]"
              >
                <div className="p-2 bg-[#014373]/30 rounded-xl group-hover:bg-[#014373]/50 transition shrink-0">
                  <Phone className="w-4 h-4 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Телефон</p>
                  <p className="text-xs font-bold text-white truncate">8 961 640-00-21</p>
                </div>
              </a>
              <a
                href={TELEGRAM_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-800/60 border border-white/10 rounded-2xl hover:border-sky-500/40 transition-all group backdrop-blur-md min-h-[48px]"
              >
                <div className="p-2 bg-sky-500/20 rounded-xl group-hover:bg-sky-500/35 transition shrink-0">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Поддержка</p>
                  <p className="text-xs font-bold text-sky-400 truncate">{clubInfo?.['Поддержка'] || '@Baza380215'}</p>
                </div>
              </a>
            </div>
          </div>

          {/* Banner / Hero Image Block (Positioned below top button & contact block) */}
          <div className="relative z-10 pt-2 border-t border-white/10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-[#014373] to-sky-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500" />
                  <img
                    src={clubInfo?.['Логотип'] || DEFAULT_LOGO}
                    alt="Клуб БАЗА"
                    className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-white/15 object-cover shadow-2xl"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
                  />
                </div>
                {isAdminOrOwner && (
                  <button
                    onClick={() => setIsLogoModalOpen(true)}
                    className="absolute -top-1 -right-1 p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white rounded-lg border border-white/10 transition shadow-md"
                    title="Изменить логотип"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                  </button>
                )}
              </div>

              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-wide">
                  ПОКЕРНЫЙ КЛУБ <span className="text-sky-400">БАЗА</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Ежедневные турниры, клубный рейтинг и система наград
                </p>
              </div>
            </div>

            {inClubPlayers.length > 0 && (
              <span className="px-4 py-2 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-2 backdrop-blur-md shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Сейчас в клубе за столами: <strong className="text-white">{inClubPlayers.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* ===== UPCOMING TOURNAMENT ===== */}
        {upcomingTournament && (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl transition hover:border-[#014373]/30">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-[#014373] to-sky-700 rounded-xl shadow-lg shadow-[#014373]/30 border border-white/10">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Ближайший турнир</span>
                  <h3 className="text-lg md:text-xl font-bold text-white mt-0.5">
                    {formatRussianDate(upcomingTournament['Дата'] || upcomingTournament['Дата и Время'])}
                  </h3>
                  {(upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание']) && (
                    <p className="text-xs text-slate-400 mt-1 max-w-md line-clamp-2">
                      {upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание']}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Записалось</span>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <Users className="w-4 h-4 text-[#014373]" />
                    <span className="text-lg font-bold text-white">{registeredCount}</span>
                    <span className="text-xs text-slate-400">/ 40</span>
                  </div>
                </div>

                {(() => {
                  const gameDateStr = upcomingTournament['Дата и Время'] || upcomingTournament['Дата'];
                  const regDeadlineStr = (upcomingTournament as any)?.['Дата окончания регистрации'] || gameDateStr;
                  const regDeadline = new Date(regDeadlineStr);
                  const playerCount = (upcomingTournament as any)?.['Кол-во игроков'] || registeredCount;

                  if (regSuccess) {
                    return (
                      <div className="px-4 py-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[44px]">
                        <CheckCircle className="w-4 h-4" /> Вы в игре!
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={handleQuickRegister}
                      disabled={regDeadline < new Date() || playerCount >= 40 || registering}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#014373] to-sky-700 hover:from-[#013357] hover:to-sky-800 text-white font-bold rounded-xl shadow-lg shadow-[#014373]/30 text-xs transition disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] flex items-center gap-2 border border-white/10"
                    >
                      {registering ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : regDeadline < new Date() ? (
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
              <span className="text-xs text-slate-400 font-normal">({inClubPlayers.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {inClubPlayers.map((player, pIdx) => (
                <div key={pIdx} className="bg-slate-900/60 border border-white/10 p-2.5 rounded-xl flex items-center gap-2.5 hover:border-[#014373]/40 transition backdrop-blur-md">
                  {player['Аватар'] ? (
                    <img
                      src={player['Аватар']}
                      alt={player['Ник']}
                      className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 text-sky-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {player['Ник']?.[0]?.toUpperCase() || 'P'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player['Ник']}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold">{player['Статус'] || 'В игре'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PROMOTIONS ===== */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg md:text-xl font-bold text-white">Акции и Спецпредложения</h2>
            </div>

            {/* Tabs & Admin Add Button */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                <button
                  onClick={() => setPromoTab('active')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
                    promoTab === 'active'
                      ? 'bg-[#014373] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Актуальные ({activePromotions.length})
                </button>
                <button
                  onClick={() => setPromoTab('past')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition min-h-[36px] ${
                    promoTab === 'past'
                      ? 'bg-[#014373] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Прошедшие ({pastPromotions.length})
                </button>
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
                  className="flex items-center gap-2 px-4 py-2 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl text-xs transition shadow-md min-h-[36px] border border-white/10 shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  Добавить
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-slate-900/60 border border-white/10 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : displayedPromotions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm bg-slate-900/40 rounded-2xl border border-white/5">
              {promoTab === 'active' ? 'Актуальных акций нет' : 'Прошедших акций нет'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {displayedPromotions.map((promo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPromo(promo)}
                  className="group bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden hover:border-[#014373]/50 transition-all duration-300 shadow-lg cursor-pointer flex flex-col backdrop-blur-md"
                >
                  <div className="relative h-36 overflow-hidden bg-slate-800">
                    <img
                      src={promo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo['Название'] || 'Акция'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    {isAdminOrOwner && (
                      <div
                        className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-lg z-10 border border-white/10"
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
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-sky-400 transition-colors line-clamp-1">
                        {promo['Название']}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                        {promo['Описание']}
                      </p>
                    </div>
                    {promo['Дата окончания'] && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                        <span>До:</span>
                        <span className="font-medium text-slate-300">{promo['Дата окончания']}</span>
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
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setIsPwaModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-sky-400" />
              Установить приложение
            </h3>
            <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                <p className="font-bold text-white mb-1">iOS (Safari)</p>
                <p>1. Нажмите «Поделиться» (стрелка вверх)</p>
                <p>2. Выберите «На экран Домой»</p>
                <p>3. Нажмите «Добавить»</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
                <p className="font-bold text-white mb-1">Android (Chrome)</p>
                <p>1. Нажмите в правом верхнем углу</p>
                <p>2. «Добавить на главный экран»</p>
                <p>3. Подтвердите установку</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PROMO DETAIL MODAL (No image overlay badge/numbers) ===== */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedPromo(null)}
              className="absolute top-4 right-4 z-10 p-1.5 bg-slate-950/80 hover:bg-black text-white rounded-full transition border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative h-52 bg-slate-800 shrink-0">
              <img
                src={selectedPromo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                alt={selectedPromo['Название']}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
            <div className="space-y-3 p-5 overflow-y-auto">
              <h2 className="text-xl font-extrabold text-white">{selectedPromo['Название']}</h2>
              {(selectedPromo['Дата начала'] || selectedPromo['Дата окончания']) && (
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                  {selectedPromo['Дата начала'] && <div>С: <span className="text-white">{selectedPromo['Дата начала']}</span></div>}
                  {selectedPromo['Дата окончания'] && <div>По: <span className="text-white">{selectedPromo['Дата окончания']}</span></div>}
                </div>
              )}
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedPromo['Описание']}</p>
            </div>
            <div className="p-5 border-t border-white/10 shrink-0">
              <Link
                href="/tournaments"
                onClick={() => setSelectedPromo(null)}
                className="w-full py-3 bg-gradient-to-r from-[#014373] to-sky-700 hover:from-[#013357] hover:to-sky-800 text-white font-bold rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2 min-h-[44px]"
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
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsPromoModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
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
                <label className="text-xs font-semibold text-slate-400">Название *</label>
                <input
                  type="text"
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Описание</label>
                <textarea
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Дата начала</label>
                  <input type="date" value={promoStartDate} onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[44px]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Дата окончания</label>
                  <input type="date" value={promoEndDate} onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[44px]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Картинка</label>
                {promoImage && (
                  <div className="mt-2 relative h-28 rounded-lg overflow-hidden border border-white/10 bg-slate-800">
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
                  className="w-full mt-2 text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#014373] file:text-white hover:file:bg-[#013357]"
                />
                {promoUploading && <p className="text-[11px] text-amber-400 mt-1">Загрузка фото...</p>}
              </div>
              <button
                type="submit"
                disabled={promoSubmitting || promoUploading}
                className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl min-h-[44px] shadow-lg shadow-[#014373]/20 disabled:opacity-50"
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
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button onClick={() => setIsLogoModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Изменить логотип</h3>
            <form onSubmit={handleUpdateLogo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">URL логотипа *</label>
                <input
                  type="url"
                  required
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#014373] min-h-[44px]"
                />
              </div>
              <button
                type="submit"
                disabled={logoUpdating}
                className="w-full py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl min-h-[44px] shadow-lg shadow-[#014373]/20 disabled:opacity-50"
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
