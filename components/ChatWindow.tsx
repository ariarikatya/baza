'use client';

import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { ChatMessage } from '@/types';

export interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string) => Promise<void>;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserId,
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
    <div className="flex flex-col h-[600px] bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand" />
          <h3 className="font-semibold text-foreground">Клубный Чат "БАЗА"</h3>
        </div>
        <span className="text-xs text-muted-foreground">Синхронизировано с Telegram</span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Нет сообщений. Напишите первым!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.playerId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <img
                  src={
                    msg.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
                  }
                  alt={msg.playerNickname}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-foreground">
                      {msg.playerNickname}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div
                    className={`p-3 rounded-xl text-sm break-words ${
                      isMe
                        ? 'bg-brand text-white rounded-tr-none'
                        : 'bg-muted text-foreground rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
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
    </div>
  );
};
