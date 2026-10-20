'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { NewsRow, NewsCommentRow, PlayerRow } from '@/types';
import { getSavedUserSession, restoreUserSessionAsync } from '@/lib/session';
import { formatRussianDate } from '@/lib/businessLogic';
import { Newspaper, MessageSquare, Send, PlusCircle, X, Edit, Trash2 } from 'lucide-react';
import { canManageContent } from '@/lib/permissions';
import { FileUploader } from '@/components/FileUploader';

export default function NewsPage() {
  const [isAddNewsOpen, setIsAddNewsOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsRow | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newNotify, setNewNotify] = useState(false);
  const [newsSubmitting, setNewsSubmitting] = useState(false);
  const [newsList, setNewsList] = useState<NewsRow[]>([]);
  const [comments, setComments] = useState<{ [newsTitle: string]: NewsCommentRow[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [newsTitle: string]: string }>({});
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<NewsRow | null>(null);

  useEffect(() => {
    const saved = getSavedUserSession();
    if (saved) {
      setUser(saved);
    } else {
      restoreUserSessionAsync().then((restored) => {
        if (restored) setUser(restored);
      });
    }

    async function fetchData() {
      try {
        const [newsRes, commentsRes] = await Promise.all([
          fetch('/api/sheets?sheet=НОВОСТИ'),
          fetch('/api/sheets?sheet=КОММЕНТАРИИ НОВОСТЕЙ'),
        ]);

        const newsData = await newsRes.json();
        const commentsData = await commentsRes.json();

        if (newsData.data && Array.isArray(newsData.data)) setNewsList(newsData.data);

        if (commentsData.data && Array.isArray(commentsData.data)) {
          const grouped: { [newsTitle: string]: NewsCommentRow[] } = {};
          commentsData.data.forEach((c: NewsCommentRow) => {
            const key = c['Новость'] || 'Общее';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(c);
          });
          setComments(grouped);
        }
      } catch (err) {
        console.error('Failed to load news:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddComment = async (newsTitle: string) => {
    const text = commentInputs[newsTitle];
    if (!text || !text.trim() || !user) return;

    const newComment: NewsCommentRow = {
      'Новость': newsTitle,
      'Игрок': user['Ник'],
      'Комментарий': text.trim(),
      'Автор': user['Ник'],
      'Дата': new Date().toISOString(),
      'Аватар': user['Аватар'] || '',
    };

    setComments((prev) => ({
      ...prev,
      [newsTitle]: [...(prev[newsTitle] || []), newComment],
    }));

    setCommentInputs((prev) => ({ ...prev, [newsTitle]: '' }));

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'КОММЕНТАРИИ НОВОСТЕЙ',
          action: 'append',
          rowData: newComment,
        }),
      });
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const handleAddNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    if (newsSubmitting) return;

    setNewsSubmitting(true);

    const newNewsRow: NewsRow = {
      'Заголовок': newTitle.trim(),
      'Текст': newText.trim(),
      'Дата': editingNews ? editingNews['Дата'] : new Date().toISOString(),
      'Автор': newAuthor.trim() || user?.['Ник'] || 'Администрация',
      'Фото': newPhoto || '',
      'Уведомление': newNotify ? 'Да' : 'Нет',
    };

    try {
      if (editingNews) {
        const res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'НОВОСТИ',
            action: 'update',
            keyName: 'Заголовок',
            keyValue: editingNews['Заголовок'],
            rowData: newNewsRow,
            userRole: user?.['Роль'] || '',
            isAdmin: user?.['Админ?'] === true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNewsList((prev) =>
            prev.map((item) => (item['Заголовок'] === editingNews['Заголовок'] ? newNewsRow : item))
          );
          setIsAddNewsOpen(false);
        } else {
          alert('Не удалось обновить новость');
        }
      } else {
        const res = await fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetName: 'НОВОСТИ',
            action: 'append',
            rowData: newNewsRow,
            userRole: user?.['Роль'] || '',
            isAdmin: user?.['Админ?'] === true,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setNewsList((prev) => [newNewsRow, ...prev]);
          setIsAddNewsOpen(false);
        } else {
          alert('Не удалось добавить новость');
        }
      }
    } catch (err) {
      console.error('Failed to save news:', err);
    } finally {
      setNewsSubmitting(false);
    }
  };

  const handleDeleteNews = async (newsItem: NewsRow) => {
    if (!confirm(`Удалить новость "${newsItem['Заголовок']}"?`)) return;

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'НОВОСТИ',
          action: 'delete',
          keyName: 'Заголовок',
          keyValue: newsItem['Заголовок'],
          userRole: user?.['Роль'] || '',
          isAdmin: user?.['Админ?'] === true,
        }),
      });
      const data = await res.json();
      if (data.success && data.deletedCount !== 0) {
        setNewsList((prev) => prev.filter((item) => item['Заголовок'] !== newsItem['Заголовок']));
      } else {
        alert(data.error || 'Запись не найдена и не удалена');
      }
    } catch (err) {
      console.error('Failed to delete news:', err);
      alert('Ошибка при удалении новости');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Newspaper className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Новости Клуба</h1>
              <p className="text-xs text-muted-foreground">Последние анонсы, отчеты и события ПК &quot;БАЗА&quot;</p>
            </div>
          </div>

          {canManageContent(user) && (
            <button
              onClick={() => {
                setEditingNews(null);
                setNewTitle('');
                setNewText('');
                setNewPhoto('');
                setNewAuthor(user?.['Ник'] || 'Администрация');
                setNewNotify(false);
                setIsAddNewsOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl shadow-lg shadow-brand/20 text-xs transition min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Добавить новость</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {newsList.map((item, idx) => {
              const newsTitle = item['Заголовок'] || `Новость #${idx + 1}`;
              const itemComments = comments[newsTitle] || [];
              return (
                <article
                  key={idx}
                  className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-brand/50 transition flex flex-col justify-between relative group"
                >
                  <div
                    onClick={() => setSelectedNews(item)}
                    className="cursor-pointer"
                  >
                    {item['Фото'] && (
                      <div className="relative w-full overflow-hidden">
                        <img
                          src={item['Фото']}
                          alt={newsTitle}
                          className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatRussianDate(item['Дата'])}</span>
                        {canManageContent(user) && (
                          <div
                            className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNews(item);
                                setNewTitle(item['Заголовок'] || '');
                                setNewText(item['Текст'] || '');
                                setNewPhoto(item['Фото'] || '');
                                setNewAuthor(item['Автор'] || user?.['Ник'] || 'Администрация');
                                setNewNotify(item['Уведомление'] === 'Да');
                                setIsAddNewsOpen(true);
                              }}
                              className="text-foreground hover:text-brand transition p-0.5"
                              title="Редактировать"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNews(item);
                              }}
                              className="text-foreground hover:text-rose-400 transition p-0.5"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h2 className="text-sm font-bold text-foreground leading-tight line-clamp-1">{newsTitle}</h2>
                      <p className="text-[11px] text-foreground/80 leading-relaxed whitespace-pre-line line-clamp-3">
                        {item['Текст']}
                      </p>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="p-3 pt-2 border-t border-border/50 mt-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                      <MessageSquare className="w-3.5 h-3.5 text-brand" />
                      <span>Комментарии ({itemComments.length})</span>
                    </div>

                    {itemComments.length > 0 && (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {itemComments.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-1.5 bg-muted/40 rounded-lg text-[10px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-foreground">{c['Игрок']}</span>
                              <span className="text-[9px] text-muted-foreground">{formatRussianDate(c['Дата'])}</span>
                            </div>
                            <p className="text-muted-foreground line-clamp-2">{c['Комментарий']}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {user && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={commentInputs[newsTitle] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [newsTitle]: e.target.value,
                            }))
                          }
                          placeholder="Оставить комментарий..."
                          className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-brand min-h-[34px]"
                        />
                        <button
                          onClick={() => handleAddComment(newsTitle)}
                          className="bg-brand text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold hover:bg-brand-light transition-colors flex items-center justify-center min-h-[34px] min-w-[34px]"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail News Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-10 p-1.5 bg-black/80 hover:bg-black text-white rounded-full transition border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
            {selectedNews['Фото'] && (
              <div className="relative w-full shrink-0 overflow-hidden">
                <img
                  src={selectedNews['Фото']}
                  alt={selectedNews['Заголовок'] || 'Новость'}
                  className="w-full h-auto block max-h-[60vh] object-cover"
                />
              </div>
            )}
            <div className="space-y-3 p-5 overflow-y-auto">
              <div className="text-xs text-muted-foreground">{formatRussianDate(selectedNews['Дата'])}</div>
              <h2 className="text-xl font-extrabold text-foreground">{selectedNews['Заголовок']}</h2>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{selectedNews['Текст']}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add News Modal */}
      {isAddNewsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsAddNewsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground">{editingNews ? 'Редактировать Новость' : 'Добавить Новость'}</h3>

            <form onSubmit={handleAddNewsSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Заголовок новости *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Грандиозный Финал Сезона..."
                  className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Текст новости *</label>
                <textarea
                  required
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Полное описание новости и детали..."
                  className="w-full mt-1 px-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground h-28 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Изображение (загрузка ImgBB)</label>
                <FileUploader onUploadComplete={(url) => setNewPhoto(url)} />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newNotify"
                  checked={newNotify}
                  onChange={(e) => setNewNotify(e.target.checked)}
                  className="w-4 h-4 text-brand rounded"
                />
                <label htmlFor="newNotify" className="text-xs text-muted-foreground cursor-pointer">
                  Отправить Telegram рассылку
                </label>
              </div>

              <button
                type="submit"
                disabled={newsSubmitting}
                className="w-full py-2.5 bg-brand hover:bg-brand-light text-white font-bold rounded-xl min-h-[44px] disabled:opacity-50"
              >
                {newsSubmitting ? 'Сохранение...' : editingNews ? 'Сохранить изменения' : 'Опубликовать новость'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
