'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow, ClubRow, DailyGameDateRow, InClubRow, PlayerRow, formatRussianDate } from '@/types';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Sparkles, Phone, MessageSquare, Utensils, Send, Bell, Calendar, Users, CheckCircle, Smartphone, Edit3, X, PlusCircle, Trash2, Edit, Trophy, ArrowRight } from 'lucide-react';

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

  // Modals state
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [logoUpdating, setLogoUpdating] = useState(false);

  // Promotion detail modal
  const [selectedPromo, setSelectedPromo] = useState<PromotionRow | null>(null);

  // Promo Add/Edit modal state
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
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
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
          const activeTournaments = tournaments.filter((tournament: any) => {
            const gameDate = new Date(tournament['Дата и Время'] || tournament['Дата']);
            const regDeadline = new Date(tournament['Дата окончания регистрации'] || tournament['Дата и Время'] || tournament['Дата']);
            const now = new Date();

            return gameDate > now && regDeadline > now;
          }).sort((a: any, b: any) => new Date(a['Дата и Время'] || a['Дата']).getTime() - new Date(b['Дата и Время'] || b['Дата']).getTime());

          const upcoming = activeTournaments[0] || null;
          setUpcomingTournament(upcoming);

          if (upcoming && gamesData.data && Array.isArray(gamesData.data)) {
            const count = gamesData.data.filter((g: any) => g['Дата'] === (upcoming['Дата'] || upcoming['Дата и Время'])).length;
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
          rowData: {
            ...clubInfo,
            'Логотип': newLogoUrl.trim(),
          },
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
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
          action: 'append',
          rowData: {
            'Дата': upcomingTournament['Дата'],
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
        {/* Professional Redesigned Hero Section */}
        <div className="relative bg-gradient-to-br from-[#090D16] via-[#0a1428] to-[#014373]/20 rounded-3xl p-6 md:p-10 border border-[#014373]/30 overflow-hidden shadow-2xl">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#014373]/20 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            {/* Club Logo Container with Glow & ON AIR Badge */}
            <div className="relative group">
              <div className="relative">
                <img
                  src={clubInfo?.['Логотип'] || DEFAULT_LOGO}
                  alt="БАЗА"
                  className="w-32 h-32 md:w-36 md:h-36 rounded-2xl border-4 border-[#014373] object-cover shadow-2xl shadow-[#014373]/50 transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
                />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#014373] to-sky-500 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg border border-sky-300/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ON AIR
                </div>
              </div>

              {isAdminOrOwner && (
                <button
                  onClick={() => setIsLogoModalOpen(true)}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-black text-white rounded-lg backdrop-blur-sm transition text-xs border border-gray-700"
                  title="Изменить логотип"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Club Info & Headlines */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-[#014373]/30 text-sky-300 border border-[#014373]/50 text-xs font-bold uppercase tracking-wider">
                  Премиум Покерный Клуб
                </span>
                {inClubPlayers.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    За столами: {inClubPlayers.length}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-white via-slate-100 to-gray-400 bg-clip-text text-transparent tracking-tight">
                  Покерный Клуб "БАЗА"
                </h1>
                <p className="text-gray-300 text-base md:text-lg max-w-2xl font-normal leading-relaxed">
                  {clubInfo?.['О клубе'] || 'Профессиональный покерный клуб. Ежедневные турниры, прозрачная система рейтингов и атмосфера честной игры.'}
                </p>
              </div>

              {/* Quick Action Navigation Buttons */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                <Link
                  href="/tournaments"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#014373] hover:bg-[#013357] text-white font-bold rounded-xl transition shadow-lg shadow-[#014373]/40 text-sm min-h-[44px]"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Расписание турниров</span>
                </Link>

                <Link
                  href="/rating"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm min-h-[44px]"
                >
                  <Trophy className="w-4 h-4 text-gray-950" />
                  <span>Рейтинг игроков</span>
                </Link>

                <a
                  href={MENU_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700 text-white font-semibold rounded-xl border border-gray-700 transition text-sm min-h-[44px]"
                >
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <span>Меню</span>
                </a>

                <a
                  href={TELEGRAM_TOURNAMENTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold rounded-xl transition text-sm min-h-[44px]"
                >
                  <Bell className="w-4 h-4" />
                  <span>Telegram</span>
                </a>

                <button
                  onClick={() => setIsPwaModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl border border-gray-700 transition text-sm min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Установить PWA</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Tournament Card & Registration */}
        {upcomingTournament && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand/10 text-brand rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand">Ближайший Турнир</span>
                  <h3 className="text-xl font-bold text-foreground">{formatRussianDate(upcomingTournament['Дата'] || upcomingTournament['Дата и Время'])}</h3>
                  {upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание'] ? (
                    <p className="text-xs text-muted-foreground">{upcomingTournament['Описание'] || upcomingTournament['"Что будет" описание']}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Зарегистрировано</span>
                  <span className="text-sm font-bold text-foreground flex items-center gap-1 justify-end">
                    <Users className="w-4 h-4 text-brand" /> {registeredCount} / 40
                  </span>
                </div>

                {(() => {
                  const now = new Date();
                  const gameDateStr = upcomingTournament['Дата и Время'] || upcomingTournament['Дата'];
                  const regDeadlineStr = (upcomingTournament as any)?.['Дата окончания регистрации'] || gameDateStr;
                  const gameDate = new Date(gameDateStr);
                  const regDeadline = new Date(regDeadlineStr);
                  const playerCount = (upcomingTournament as any)?.['Кол-во игроков'] || registeredCount;

                  if (regSuccess) {
                    return (
                      <div className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[44px]">
                        <CheckCircle className="w-4 h-4" /> Вы зарегистрированы!
                      </div>
                    );
                  }

                  return (
                    <button
                      onClick={handleQuickRegister}
                      disabled={gameDate < now || regDeadline < now || playerCount >= 40 || registering}
                      className="px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-xs transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                      {registering ? 'Регистрация...' : regDeadline < now ? 'Регистрация завершена' : 'Записаться'}
                    </button>
                  );
                })()}
              </div>
            </div>

            {upcomingTournament['Описание'] && (
              <p className="text-xs text-muted-foreground leading-relaxed">{upcomingTournament['Описание']}</p>
            )}
          </div>
        )}

        {/* Players In Club (За столом) */}
        {inClubPlayers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-brand" />
              <span>Сейчас за столами ({inClubPlayers.length})</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {inClubPlayers.map((player, pIdx) => (
                <div key={pIdx} className="bg-card border border-border p-3 rounded-xl flex items-center gap-2.5 shadow-sm">
                  <img
                    src={player['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={player['Ник']}
                    className="w-9 h-9 rounded-full object-cover border border-brand shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{player['Ник']}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold">{player['Статус'] || 'В игре'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="tel:89616400021"
            className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-brand transition"
          >
            <Phone className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Телефон для связи</p>
              <p className="text-sm font-semibold text-foreground">8 961 640-00-21</p>
            </div>
          </a>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
            <MessageSquare className="w-6 h-6 text-brand flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Поддержка в Telegram</p>
              <a href={TELEGRAM_SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand hover:underline">
                {clubInfo?.['Поддержка'] || '@Baza380215'}
              </a>
            </div>
          </div>
        </div>

        {/* Promotions Carousel Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Акции и Спецпредложения</h2>
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
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-light text-white font-bold rounded-xl text-xs transition shadow-md min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Добавить акцию</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {promotions.map((promo, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPromo(promo)}
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-brand transition-all duration-300 shadow-md flex flex-col cursor-pointer relative"
                >
                  <div className="relative h-40 overflow-hidden bg-muted">
                    <img
                      src={promo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={promo['Название'] || 'Акция'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-brand/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm">
                      {promo['Уведомление'] || 'АКЦИЯ'}
                    </span>

                    {isAdminOrOwner && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1 rounded-lg z-10"
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
                          className="p-1 text-white hover:text-brand transition"
                          title="Изменить"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Удалить акцию "${promo['Название']}"?`)) return;
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
                              console.error('Failed to delete promotion:', err);
                            }
                          }}
                          className="p-1 text-white hover:text-rose-400 transition"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-base group-hover:text-brand transition-colors line-clamp-1">
                        {promo['Название']}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                        {promo['Описание']}
                      </p>
                    </div>
                    {promo['Дата окончания'] && (
                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Действует до:</span>
                        <span className="font-medium text-foreground">{promo['Дата окончания']}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PWA Slide-in Modal */}
      {isPwaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsPwaModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-brand" />
              <span>Как добавить приложение на экран</span>
            </h3>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3 bg-muted rounded-xl border border-border">
                <p className="font-bold text-foreground mb-1">Для iOS (Safari):</p>
                <p>1. Нажмите кнопку «Поделиться» (иконка со стрелкой вверх внизу экрана).</p>
                <p>2. Прокрутите список и выберите «На экран „Домой“».</p>
                <p>3. Нажмите «Добавить» в правом верхнем углу.</p>
              </div>

              <div className="p-3 bg-muted rounded-xl border border-border">
                <p className="font-bold text-foreground mb-1">Для Android (Chrome):</p>
                <p>1. Нажмите на три точки в правом верхнем углу браузера.</p>
                <p>2. Выберите «Добавить на главный экран» или «Установить приложение».</p>
                <p>3. Подтвердите установку.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Detail Popup Modal */}
      {selectedPromo && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedPromo(null)}
              className="absolute top-4 right-4 z-10 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-60 -mx-6 -mt-6 bg-muted overflow-hidden">
              <img
                src={selectedPromo['Картинка'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                alt={selectedPromo['Название']}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-4 bg-brand text-white text-xs font-bold px-3 py-1 rounded-md shadow-md">
                {selectedPromo['Уведомление'] || 'АКЦИЯ'}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto pt-2">
              <h2 className="text-2xl font-extrabold text-foreground">{selectedPromo['Название']}</h2>

              {(selectedPromo['Дата начала'] || selectedPromo['Дата окончания']) && (
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground bg-muted p-3 rounded-xl border border-border">
                  {selectedPromo['Дата начала'] && (
                    <div>С: <span className="text-foreground">{selectedPromo['Дата начала']}</span></div>
                  )}
                  {selectedPromo['Дата окончания'] && (
                    <div>По: <span className="text-foreground">{selectedPromo['Дата окончания']}</span></div>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedPromo['Описание']}
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Link
                href="/tournaments"
                onClick={() => setSelectedPromo(null)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Calendar className="w-4 h-4" />
                <span>Записаться на игру</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add / Edit Promotion Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPromoModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground">
              {editingPromo ? 'Изменить акцию' : 'Добавить акцию'}
            </h3>

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

                    setPromotions((prev) =>
                      prev.map((p) => (p['Название'] === editingPromo['Название'] ? rowData : p))
                    );
                  } else {
                    await fetch('/api/sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sheetName: 'АКЦИИ',
                        action: 'append',
                        rowData,
                      }),
                    });

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
                <label className="text-xs font-semibold text-muted-foreground">Название *</label>
                <input
                  type="text"
                  required
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                <textarea
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Дата начала</label>
                  <input
                    type="date"
                    value={promoStartDate}
                    onChange={(e) => setPromoStartDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Дата окончания</label>
                  <input
                    type="date"
                    value={promoEndDate}
                    onChange={(e) => setPromoEndDate(e.target.value)}
                    className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Картинка</label>
                {promoImage && (
                  <div className="mt-2 relative h-32 rounded-lg overflow-hidden border border-border bg-muted">
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
                      const compressed = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                      });

                      const formData = new FormData();
                      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
                      if (!apiKey) throw new Error('ImgBB API key not found');
                      formData.append('image', compressed);

                      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: formData,
                      });
                      const json = await res.json();
                      if (json.data && json.data.url) {
                        setPromoImage(json.data.url);
                      }
                    } catch (err) {
                      console.error('Image upload failed:', err);
                    } finally {
                      setPromoUploading(false);
                    }
                  }}
                  className="w-full mt-2 text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand file:text-white hover:file:bg-brand-light"
                />
                {promoUploading && <p className="text-[11px] text-amber-400 mt-1">Сжатие и загрузка фото...</p>}
              </div>

              <button
                type="submit"
                disabled={promoSubmitting || promoUploading}
                className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px] shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                {promoSubmitting ? 'Сохранение...' : editingPromo ? 'Изменить акцию' : 'Сохранить акцию'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Logo Edit Modal */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsLogoModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground">Изменить Логотип Клуба</h3>

            <form onSubmit={handleUpdateLogo} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">URL логотипа *</label>
                <input
                  type="url"
                  required
                  value={newLogoUrl}
                  onChange={(e) => setNewLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={logoUpdating}
                className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px] shadow-lg shadow-brand/20"
              >
                {logoUpdating ? 'Сохранение...' : 'Обновить логотип'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
