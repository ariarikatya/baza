'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatRow, PlayerRow } from '@/types';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('baza_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/sheets?sheet=ЧАТ');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
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

    const newMessage: ChatRow = {
      'Игрок': user['Ник'],
      'Сообщение': text,
      'Кому? От кого?': 'Всем',
      'Дата и время отправки': new Date().toISOString(),
      'Игрок фото': user['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Игрок почта': user['Email'] || `${user['Ник']}@baza.ru`,
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMessage]);

    try {
      // Write to Sheets API
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ЧАТ',
          action: 'write',
          rowData: newMessage,
        }),
      });

      // Send to Telegram Proxy via Make.com webhook
      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user['User ID'] || user['Telegram ID'] || user['Ник'],
          message: `💬 [ЧАТ КЛУБА] ${user['Ник']}: ${text}`,
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
          currentNick={user?.['Ник']}
          onSendMessage={handleSendMessage}
        />
      </div>
    </AppLayout>
  );
}
