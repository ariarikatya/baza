'use client';

import React, { useState } from 'react';
import { Send, ArrowLeft, MessageSquare, Sparkles, Search, UserCheck } from 'lucide-react';
import { ChatRow, PlayerRow, formatRussianDate } from '@/types';
import { getRoleDisplayName } from '@/lib/roleDisplay';
import { isClubAdmin } from '@/lib/permissions';

export interface ConversationThread {
  partnerEmail: string;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage: string;
  lastTime: string;
}

export interface ChatWindowProps {
  threads: ConversationThread[];
  activeThread: ConversationThread | null;
  messages: ChatRow[];
  currentNick?: string;
  currentRole?: string;
  rolePlayers?: PlayerRow[];
  onSelectThread: (thread: ConversationThread) => void;
  onBackToThreads: () => void;
  onSendMessage: (text: string) => Promise<void>;
  onRetryMessage?: (msg: any) => Promise<void>;
  onStartChat?: (player: PlayerRow) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  threads,
  activeThread,
  messages,
  currentNick,
  currentRole = '',
  rolePlayers = [],
  onSelectThread,
  onBackToThreads,
  onSendMessage,
  onRetryMessage,
  onStartChat,
}) => {
  const isCurrentUserRoleEmpty = !currentRole || String(currentRole).trim() === '';
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(inputText.trim());
      setInputText('');
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 pt-safe border-b border-border bg-muted/40 flex items-center justify-between">
        {activeThread ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToThreads}
              className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {activeThread.partnerAvatar ? (
                <img
                  src={activeThread.partnerAvatar}
                  alt={activeThread.partnerName}
                  className="w-10 h-10 rounded-full object-cover border border-brand"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted border border-brand text-brand font-bold text-sm flex items-center justify-center shrink-0">
                  {activeThread.partnerName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm">{activeThread.partnerName}</h3>
                  {isClubAdmin(activeThread.partnerName) && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-brand/10 text-sky-400 border border-brand/20">
                      Администратор
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{activeThread.partnerEmail}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-foreground text-base">Чаты</h3>
          </div>
        )}
      </div>

      {/* Content Area */}
      {!activeThread ? (
        /* Threads List View */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Available Role Players List */}
          {rolePlayers && rolePlayers.length > 0 && (
            <div className="space-y-3 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span>Доступные чаты ({rolePlayers.length})</span>
                </div>
              </div>

              {/* Search Bar for Role Players */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по нику или роли..."
                  className="w-full bg-muted/60 border border-border/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand min-h-[38px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {rolePlayers
                  .filter((p) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    const nick = String(p['Ник'] || '').toLowerCase();
                    const role = String(p['Роль'] || '').toLowerCase();
                    return isCurrentUserRoleEmpty ? role.includes(q) : (nick.includes(q) || role.includes(q));
                  })
                  .map((player, pIdx) => {
                    const displayName = isCurrentUserRoleEmpty ? getRoleDisplayName(player) : player['Ник'];
                    return (
                      <div
                        key={pIdx}
                        className="flex items-center justify-between p-2.5 bg-muted/40 border border-border/60 hover:border-brand/50 rounded-xl shadow-sm transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {player['Аватар'] ? (
                            <img
                              src={player['Аватар']}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover border border-brand/40 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted border border-brand/40 text-brand font-bold text-xs flex items-center justify-center shrink-0">
                              {displayName?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="font-bold text-foreground text-xs truncate">{displayName}</h5>
                            {!isCurrentUserRoleEmpty && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-brand/10 text-sky-400 border border-brand/20 truncate">
                                {getRoleDisplayName(player)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onStartChat && onStartChat(player)}
                          className="px-2.5 py-1 bg-brand hover:bg-brand-light text-white text-xs font-bold rounded-lg shadow transition shrink-0 min-h-[32px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Чат</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Regular Active Threads */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
              Активные диалоги
            </h4>
            {threads.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                У вас пока нет активных диалогов.
              </div>
            ) : (
              threads.map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectThread(t)}
                  className="flex items-center justify-between p-4 bg-muted/40 hover:bg-muted border border-border/60 rounded-xl cursor-pointer transition shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {t.partnerAvatar ? (
                      <img
                        src={t.partnerAvatar}
                        alt={t.partnerName}
                        className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted border border-border text-brand font-bold text-sm flex items-center justify-center shrink-0">
                        {t.partnerName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-foreground text-sm truncate">{t.partnerName}</h4>
                      <p className="text-xs text-muted-foreground truncate">{t.lastMessage || 'Нет сообщений'}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {formatRussianDate(t.lastTime)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Conversation Feed & Input */
        <>
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Нет сообщений в данном диалоге.
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg['Игрок']?.toLowerCase() === currentNick?.toLowerCase();
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {msg['Игрок фото'] ? (
                      <img
                        src={msg['Игрок фото']}
                        alt={msg['Игрок']}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted border border-border text-brand font-bold text-xs flex items-center justify-center shrink-0">
                        {msg['Игрок']?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {msg['Игрок']}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatRussianDate(msg['Дата и время отправки'])}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-xl text-sm break-words ${
                          (msg as any)._status === 'failed'
                            ? 'bg-slate-800 text-slate-400 border border-red-500/50 rounded-tr-none'
                            : isMe
                            ? 'bg-brand text-white rounded-tr-none'
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                      >
                        {msg['Сообщение']}
                        {(msg as any)._status === 'failed' && (
                          <div className="mt-1 flex items-center justify-between text-[10px] text-red-400 pt-1 border-t border-red-500/20">
                            <span>Не отправлено</span>
                            {onRetryMessage && (
                              <button
                                type="button"
                                onClick={() => onRetryMessage(msg)}
                                className="underline font-bold hover:text-red-300 ml-2"
                              >
                                Повторить
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2 pb-safe">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Напишите сообщение..."
              className="flex-1 bg-muted border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand min-h-[44px]"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="bg-brand text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-light disabled:opacity-50 transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
