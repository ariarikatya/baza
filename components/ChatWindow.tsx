'use client';

import React, { useState } from 'react';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import { ChatRow, formatRussianDate } from '@/types';

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
  onSelectThread: (thread: ConversationThread) => void;
  onBackToThreads: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  threads,
  activeThread,
  messages,
  currentNick,
  onSelectThread,
  onBackToThreads,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

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
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
        {activeThread ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToThreads}
              className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition flex items-center justify-center min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <img
                src={activeThread.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt={activeThread.partnerName}
                className="w-9 h-9 rounded-full object-cover border border-brand"
              />
              <div>
                <h3 className="font-bold text-foreground text-sm">{activeThread.partnerName}</h3>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {threads.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
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
                  <img
                    src={t.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={t.partnerName}
                    className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                  />
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
                    <img
                      src={
                        msg['Игрок фото'] ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                      }
                      alt={msg['Игрок']}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
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
                          isMe
                            ? 'bg-brand text-white rounded-tr-none'
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}
                      >
                        {msg['Сообщение']}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
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
