'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PromotionRow, ClubRow, DailyGameDateRow, InClubRow, PlayerRow, formatRussianDate } from '@/types';
import { Sparkles, Phone, MessageSquare, Utensils, Send, Bell, Calendar, Users, CheckCircle, Smartphone, Edit3, X } from 'lucide-react';

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
          const now = new Date();
          const upcoming = datesData.data
            .filter((d: any) => {
              const regEndStr = d['Дата окончания регистрации'] || d['Дата'];
              const regEnd = new Date(regEndStr);
              return !isNaN(regEnd.getTime()) && regEnd > now;
            })
            .sort((a: any, b: any) => new Date(a['Дата']).getTime() - new Date(b['Дата']).getTime())[0] || datesData.data[0];

          setUpcomingTournament(upcoming || null);

          if (upcoming && gamesData.data && Array.isArray(gamesData.data)) {
            const count = gamesData.data.filter((g: any) => g['Дата'] === upcoming['Дата']).length;
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
        {/* Banner with Club Logo from Клуб sheet */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#014373]/90 via-[#014373] to-gray-900 p-6 md:p-10 shadow-xl border border-gray-800">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={clubInfo?.['Логотип'] || DEFAULT_LOGO}
                alt="Логотип БАЗА"
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-2 border-[#014373] object-cover shadow-2xl shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO; }}
              />
              {isAdminOrOwner && (
                <button
                  onClick={() => setIsLogoModalOpen(true)}
                  className="absolute bottom-1 right-1 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg backdrop-blur-sm transition text-xs flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-w-2xl text-center md:text-left space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm">
                Добро пожаловать в ПК "БАЗА"
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Покерный Клуб "БАЗА"
              </h1>
              <p className="text-sm md:text-base text-blue-100 max-w-xl leading-relaxed">
                {clubInfo?.['О клубе'] || 'Место встречи профессионалов и любителей покера. Ежедневные турниры, прозрачные рейтинги и честная игра.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <a
                  href={MENU_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-extrabold rounded-xl transition shadow-lg shadow-amber-500/20 text-sm min-h-[44px]"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Наше меню</span>
                </a>

                <a
                  href={TELEGRAM_TOURNAMENTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl transition shadow-lg shadow-sky-500/20 text-sm min-h-[44px]"
                >
                  <Bell className="w-4 h-4" />
                  <span>Узнавать о новых турнирах</span>
                </a>

                <a
                  href={TELEGRAM_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600/80 hover:bg-sky-700 text-white font-extrabold rounded-xl transition shadow-lg border border-sky-400/30 text-sm min-h-[44px]"
                >
                  <Send className="w-4 h-4" />
                  <span>Написать в телеграмм</span>
                </a>

                <button
                  onClick={() => setIsPwaModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition shadow-lg border border-gray-700 text-sm min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4 text-brand" />
                  <span>Как добавить на экран...</span>
                </button>
              </div>
            </div>
          </div>
          <div className="absolute right-[-20px] bottom-[-40px] opacity-10 pointer-events-none">
            <div className="w-96 h-96 rounded-full bg-white blur-3xl"></div>
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
                  <h3 className="text-xl font-bold text-foreground">{upcomingTournament['Название'] || 'Ежедневная Игра'}</h3>
                  <p className="text-xs text-muted-foreground">{formatRussianDate(upcomingTournament['Дата'])}</p>
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
                  const regEndStr = (upcomingTournament as any)?.['Дата окончания регистрации'] || upcomingTournament['Дата'];
                  const isRegistrationClosed = regEndStr && new Date(regEndStr) < now;
                  const isFull = ((upcomingTournament as any)?.['Кол-во игроков'] || registeredCount) >= 41;

                  if (isRegistrationClosed) {
                    return (
                      <span className="text-red-500 font-extrabold text-sm px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                        Регистрация завершена
                      </span>
                    );
                  }

                  if (regSuccess) {
                    return (
                      <div className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[44px]">
                        <CheckCircle className="w-4 h-4" /> Вы зарегистрированы!
                      </div>
                    );
                  }

                  if (!isFull) {
                    return (
                      <button
                        onClick={handleQuickRegister}
                        disabled={registering}
                        className="px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-xs transition disabled:opacity-50 min-h-[44px]"
                      >
                        {registering ? 'Регистрация...' : 'Быстрая регистрация'}
                      </button>
                    );
                  }

                  return null;
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
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Акции и Спецпредложения</h2>
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
                  className="group bg-card border border-border rounded-xl overflow-hidden hover:border-brand transition-all duration-300 shadow-md flex flex-col"
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
