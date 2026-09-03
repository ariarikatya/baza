'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { FileUploader } from '@/components/FileUploader';
import { SeasonalTournamentRow, DailyGameDateRow, PlayerRow, formatRussianDate } from '@/types';
import { Edit3, PlusCircle, Calendar, Trophy, Trash2, CheckCircle2, X, Clock } from 'lucide-react';

export default function EventsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<PlayerRow | null>(null);
  const [seasonalTournaments, setSeasonalTournaments] = useState<SeasonalTournamentRow[]>([]);
  const [dailyGameDates, setDailyGameDates] = useState<DailyGameDateRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalType, setModalType] = useState<'seasonal' | 'daily' | null>(null);

  // Seasonal Tournament Form State
  const [sTitle, setSTitle] = useState('');
  const [sStartDate, setSStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [sEndDate, setSEndDate] = useState(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);
  const [sBuyIn, setSBuyIn] = useState('5000');
  const [sStatus, setSStatus] = useState('Активен');
  const [sDesc, setSDesc] = useState('');
  const [sPhoto, setSPhoto] = useState('');
  const [sPrepay, setSPrepay] = useState('Да');
  const [sNotify, setSNotify] = useState(false);

  // Daily Tournament Form State
  const [dDateTime, setDDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [dRegDeadline, setDRegDeadline] = useState(new Date().toISOString().slice(0, 16));
  const [dTitle, setDTitle] = useState('');
  const [dDesc, setDDesc] = useState('');
  const [dWhatWillBe, setDWhatWillBe] = useState('');
  const [dImage, setDImage] = useState('');
  const [dIsPaid, setDIsPaid] = useState(true);
  const [dCost, setDCost] = useState('3000');
  const [dNotify, setDNotify] = useState(false);

  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        const u: PlayerRow = JSON.parse(stored);
        setCurrentUser(u);
        const role = u['Роль'];
        const isAdmin = role === 'Админ';
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

    async function loadEventsData() {
      try {
        const [seasonalRes, datesRes] = await Promise.all([
          fetch('/api/sheets?sheet=СЕЗОННЫЕ ТУРНИРЫ'),
          fetch('/api/sheets?sheet=ДАТЫ ЕЖЕДНЕВНЫХ ИГР'),
        ]);

        const seasonalData = await seasonalRes.json();
        const datesData = await datesRes.json();

        if (seasonalData.data && Array.isArray(seasonalData.data)) setSeasonalTournaments(seasonalData.data);
        if (datesData.data && Array.isArray(datesData.data)) setDailyGameDates(datesData.data);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEventsData();
  }, [router]);

  const role = currentUser?.['Роль'];
  if (role !== 'Админ') return null;

  // Seasonal Tournaments Filter - exclude completed games (where Завершить турнир is checked/Да)
  const activeSeasonal = seasonalTournaments.filter((t) => {
    const isFinished = t['Завершить турнир'] === 'Да' || t['Завершено'] === 'Да';
    return !isFinished;
  });

  // Action: Add Seasonal Tournament
  const handleAddSeasonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) return;

    try {
      const newSeasonal: SeasonalTournamentRow = {
        'Название': sTitle.trim(),
        'Дата начала': sStartDate,
        'Дата окончания': sEndDate,
        'Взнос': sBuyIn,
        'Статус': sStatus,
        'Описание': sDesc.trim(),
        'Фото': sPhoto || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
        'Предоплата?': sPrepay,
        'Уведомление': sNotify ? 'Да' : 'Нет',
        'Завершить турнир': 'Нет',
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'append',
          rowData: newSeasonal,
        }),
      });

      setSeasonalTournaments((prev) => [...prev, newSeasonal]);
      setMessage('Сезонный турнир успено добавлен!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setSTitle('');
        setSDesc('');
        setSPhoto('');
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Toggle Finish Seasonal Tournament
  const handleToggleFinishSeasonal = async (tournament: SeasonalTournamentRow) => {
    const newFinishedStatus = tournament['Завершить турнир'] === 'Да' ? 'Нет' : 'Да';

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'update',
          keyName: 'Название',
          keyValue: tournament['Название'],
          rowData: {
            ...tournament,
            'Завершить турнир': newFinishedStatus,
            'Статус': newFinishedStatus === 'Да' ? 'Завершен' : 'Активен',
          },
        }),
      });

      setSeasonalTournaments((prev) =>
        prev.map((t) =>
          t['Название'] === tournament['Название']
            ? { ...t, 'Завершить турнир': newFinishedStatus, 'Статус': newFinishedStatus === 'Да' ? 'Завершен' : 'Активен' }
            : t
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Delete Seasonal Tournament
  const handleDeleteSeasonal = async (title: string) => {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'СЕЗОННЫЕ ТУРНИРЫ',
          action: 'delete',
          keyValue: title,
        }),
      });

      setSeasonalTournaments((prev) => prev.filter((t) => t['Название'] !== title));
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Add Daily Tournament
  const handleAddDaily = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const newDaily: DailyGameDateRow = {
        'Дата': dDateTime,
        'Название': dTitle.trim() || formatRussianDate(dDateTime),
        'Изображение': dImage || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
        'Описание': dDesc.trim() || dWhatWillBe.trim(),
        'Всего игроков': 0,
        'Банк рейтинга': dIsPaid ? Number(dCost) || 3000 : 0,
        'Вес турнира': 1.0,
      };

      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР',
          action: 'append',
          rowData: newDaily,
        }),
      });

      setDailyGameDates((prev) => [...prev, newDaily]);
      setMessage('Ежедневный турнир успешно добавлен!');
      setTimeout(() => {
        setMessage('');
        setModalType(null);
        setDTitle('');
        setDDesc('');
        setDWhatWillBe('');
        setDImage('');
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Delete Daily Tournament
  const handleDeleteDaily = async (dateVal: string) => {
    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР',
          action: 'delete',
          keyValue: dateVal,
        }),
      });

      setDailyGameDates((prev) => prev.filter((d) => d['Дата'] !== dateVal));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Edit3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Управление Событиями и Турнирами</h1>
              <p className="text-xs text-muted-foreground">Панель администратора для создания и редактирования сезонов и ежедневных игр</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalType('seasonal')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" /> Добавить Сезонный
            </button>
            <button
              onClick={() => setModalType('daily')}
              className="px-4 py-2 bg-brand hover:bg-brand-light text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" /> Добавить Ежедневный
            </button>
          </div>
        </div>

        {/* Section 1: Active Seasonal Tournaments */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-foreground">Сезонные Турниры ({activeSeasonal.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSeasonal.map((t, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="relative h-44 bg-muted rounded-xl overflow-hidden border border-border">
                    <img
                      src={t['Фото'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={t['Название']}
                      className="w-full h-full object-contain bg-slate-800 rounded-t-lg"
                    />
                    <span className="absolute top-3 left-3 bg-amber-500 text-gray-950 font-bold text-xs px-2.5 py-1 rounded-md shadow-md">
                      {t['Статус'] || 'Активен'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground">{t['Название']}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t['Описание']}</p>

                  <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl text-xs font-semibold border border-border">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Взнос</span>
                      <span className="text-emerald-400">{t['Взнос'] ? `${Number(t['Взнос']).toLocaleString()} ₽` : '0 ₽'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Даты</span>
                      <span className="text-foreground">{t['Дата начала']} - {t['Дата окончания']}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                  <button
                    onClick={() => handleToggleFinishSeasonal(t)}
                    className="flex-1 py-2 px-3 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-bold transition min-h-[40px]"
                  >
                    Завершить турнир
                  </button>

                  <button
                    onClick={() => handleDeleteSeasonal(t['Название'])}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition min-h-[40px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Daily Tournaments List */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand" />
            <h2 className="text-xl font-bold text-foreground">Календарь Ежедневных Игр ({dailyGameDates.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {dailyGameDates.map((game, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-36 bg-muted rounded-xl overflow-hidden mb-3 border border-border">
                    <img
                      src={game['Изображение'] || 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600'}
                      alt={game['Название'] || 'Ежедневная Игра'}
                      className="w-full h-full object-contain bg-slate-800 rounded-t-lg"
                    />
                    <span className="absolute top-2 left-2 bg-brand text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                      {formatRussianDate(game['Дата'])}
                    </span>
                  </div>

                  <h3 className="font-bold text-foreground text-sm">{formatRussianDate(game['Дата'] || game['Дата и Время'])}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{game['Описание']}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">{game['Банк рейтинга'] || 0} ₽</span>
                  <button
                    onClick={() => handleDeleteDaily(game['Дата'])}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Form Overlay */}
        {modalType && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setModalType(null)}
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
                  {/* Add Seasonal Tournament Modal */}
                  {modalType === 'seasonal' && (
                    <form onSubmit={handleAddSeasonal} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Сезонный Турнир</h3>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Название Турнира *</label>
                        <input
                          type="text"
                          required
                          value={sTitle}
                          onChange={(e) => setSTitle(e.target.value)}
                          placeholder="Весенний Кубок 2024"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Дата начала</label>
                          <input
                            type="date"
                            value={sStartDate}
                            onChange={(e) => setSStartDate(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Дата окончания</label>
                          <input
                            type="date"
                            value={sEndDate}
                            onChange={(e) => setSEndDate(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Взнос (₽)</label>
                        <input
                          type="number"
                          value={sBuyIn}
                          onChange={(e) => setSBuyIn(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                        <textarea
                          value={sDesc}
                          onChange={(e) => setSDesc(e.target.value)}
                          placeholder="Правила и структура призовых..."
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground h-20 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Фото турнира (загрузка ImgBB)</label>
                        <FileUploader onUploadComplete={(url) => setSPhoto(url)} />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sNotify"
                          checked={sNotify}
                          onChange={(e) => setSNotify(e.target.checked)}
                          className="w-4 h-4 text-brand rounded"
                        />
                        <label htmlFor="sNotify" className="text-xs text-muted-foreground cursor-pointer">
                          Отправить Telegram уведомление игрокам
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl min-h-[44px]"
                      >
                        Создать сезонный турнир
                      </button>
                    </form>
                  )}

                  {/* Add Daily Tournament Modal */}
                  {modalType === 'daily' && (
                    <form onSubmit={handleAddDaily} className="space-y-4">
                      <h3 className="text-lg font-bold text-foreground">Добавить Ежедневный Турнир</h3>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Название Игра *</label>
                        <input
                          type="text"
                          required
                          value={dTitle}
                          onChange={(e) => setDTitle(e.target.value)}
                          placeholder="Ежедневный турнир No Limit"
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Дата и Время</label>
                          <input
                            type="datetime-local"
                            value={dDateTime}
                            onChange={(e) => setDDateTime(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground min-h-[44px]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground">Конец регистрации</label>
                          <input
                            type="datetime-local"
                            value={dRegDeadline}
                            onChange={(e) => setDRegDeadline(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Описание</label>
                        <textarea
                          value={dDesc}
                          onChange={(e) => setDDesc(e.target.value)}
                          placeholder="Краткое описание события..."
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground h-16 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Стоимость (₽)</label>
                        <input
                          type="number"
                          value={dCost}
                          onChange={(e) => setDCost(e.target.value)}
                          className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Изображение (загрузка ImgBB)</label>
                        <FileUploader onUploadComplete={(url) => setDImage(url)} />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px]"
                      >
                        Добавить ежедневную игру
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
