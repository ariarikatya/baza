'use client';

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { NewsItem, NewsComment, Player } from '@/types';
import { Newspaper, MessageSquare, Send, User } from 'lucide-react';

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [comments, setComments] = useState<{ [newsId: string]: NewsComment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [newsId: string]: string }>({});
  const [user, setUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) setUser(JSON.parse(stored));

    async function fetchData() {
      try {
        const [newsRes, commentsRes] = await Promise.all([
          fetch('/api/sheets?sheet=НОВОСТИ'),
          fetch('/api/sheets?sheet=КОММЕНТАРИИ НОВОСТЕЙ'),
        ]);

        const newsData = await newsRes.json();
        const commentsData = await commentsRes.json();

        if (newsData.data) setNewsList(newsData.data);

        if (commentsData.data) {
          const grouped: { [newsId: string]: NewsComment[] } = {};
          commentsData.data.forEach((c: NewsComment) => {
            if (!grouped[c.newsId]) grouped[c.newsId] = [];
            grouped[c.newsId].push(c);
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

  const handleAddComment = async (newsId: string) => {
    const text = commentInputs[newsId];
    if (!text || !text.trim() || !user) return;

    const newComment: NewsComment = {
      id: 'nc_' + Date.now(),
      newsId,
      playerId: user.id,
      playerNickname: user.nickname,
      avatarUrl: user.avatarUrl,
      comment: text.trim(),
      createdAt: new Date().toISOString().split('T')[0],
    };

    setComments((prev) => ({
      ...prev,
      [newsId]: [...(prev[newsId] || []), newComment],
    }));

    setCommentInputs((prev) => ({ ...prev, [newsId]: '' }));

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'КОММЕНТАРИИ НОВОСТЕЙ',
          action: 'write',
          data: newComment,
        }),
      });
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-6 shadow-md">
          <div className="p-3 bg-brand/10 text-brand rounded-xl">
            <Newspaper className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Новости Клуба</h1>
            <p className="text-xs text-muted-foreground">Последние анонсы, отчеты и события ПК "БАЗА"</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {newsList.map((item) => {
              const itemComments = comments[item.id] || [];
              return (
                <article
                  key={item.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg"
                >
                  {item.imageUrl && (
                    <div className="relative h-64 bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Автор: {item.author || 'Администрация'}</span>
                      <span>{item.createdAt}</span>
                    </div>

                    <h2 className="text-2xl font-bold text-foreground">{item.title}</h2>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                      {item.content}
                    </p>

                    {/* Comments Section */}
                    <div className="pt-6 border-t border-border space-y-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <MessageSquare className="w-4 h-4 text-brand" />
                        <span>Комментарии ({itemComments.length})</span>
                      </div>

                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {itemComments.map((c) => (
                          <div key={c.id} className="p-3 bg-muted/40 rounded-xl text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">{c.playerNickname}</span>
                              <span className="text-[10px] text-muted-foreground">{c.createdAt}</span>
                            </div>
                            <p className="text-muted-foreground">{c.comment}</p>
                          </div>
                        ))}
                      </div>

                      {user && (
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            value={commentInputs[item.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Оставить комментарий..."
                            className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
                          />
                          <button
                            onClick={() => handleAddComment(item.id)}
                            className="bg-brand text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-brand-light transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
