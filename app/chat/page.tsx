'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatMessage, Player } from '@/types';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<Player | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/sheets?sheet=ЧАТ');
      const json = await res.json();
      if (json.data) {
        setMessages(json.data);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const newMessage: ChatMessage = {
      id: 'c_' + Date.now(),
      playerId: user.id,
      playerNickname: user.nickname,
      avatarUrl: user.avatarUrl,
      message: text,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMessage]);

    try {
      // Write to Sheets API
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: 'ЧАТ',
          action: 'write',
          data: newMessage,
        }),
      });

      // Send to Telegram Proxy
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          message: `[ЧАТ КЛУБА] ${user.nickname}: ${text}`,
        }),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <ChatWindow
          messages={messages}
          currentUserId={user?.id}
          onSendMessage={handleSendMessage}
        />
      </div>
    </AppLayout>
  );
}
