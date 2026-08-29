'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ChatWindow, ConversationThread } from '@/components/ChatWindow';
import { ChatRow, PlayerRow, formatRussianDate } from '@/types';
import { groupChatThreads } from '@/lib/calculations';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [allMessages, setAllMessages] = useState<ChatRow[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);

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
        setAllMessages(json.data);
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

  // View 1 (Thread List) & View 2 (Conversation) using groupChatThreads from lib/calculations.ts
  useEffect(() => {
    if (!user) return;
    const myEmail = (user['Email'] || `${user['Ник']}@baza.ru`).trim().toLowerCase();
    const grouped = groupChatThreads(allMessages, myEmail);

    // Map to ConversationThread with safe formatRussianDate DD.MM.YYYY HH:mm
    const mappedThreads: ConversationThread[] = grouped.map((t) => ({
      partnerEmail: t.partnerEmail,
      partnerName: t.partnerName,
      partnerAvatar: t.partnerAvatar,
      lastMessage: t.lastMessage,
      lastTime: formatRussianDate(t.lastTime),
    }));

    setThreads(mappedThreads);
  }, [allMessages, user]);

  const filteredMessages = allMessages.filter((msg) => {
    if (!user || !activeThread) return false;
    const myEmail = (user['Email'] || `${user['Ник']}@baza.ru`).trim().toLowerCase();
    const partnerEmail = activeThread.partnerEmail.trim().toLowerCase();

    const senderEmail = (msg['Игрок почта'] || '').trim().toLowerCase();
    const recipientEmail = (msg['Кому? От кого?'] || '').trim().toLowerCase();

    return (
      (senderEmail === myEmail && recipientEmail === partnerEmail) ||
      (senderEmail === partnerEmail && (recipientEmail === myEmail || recipientEmail === 'всем'))
    );
  });

  const handleSendMessage = async (text: string) => {
    if (!user || !activeThread) {
      router.push('/login');
      return;
    }

    const newMessage: ChatRow = {
      'Игрок': user['Ник'],
      'Сообщение': text,
      'Кому? От кого?': activeThread.partnerEmail,
      'Дата и время отправки': new Date().toISOString(),
      'Игрок фото': user['Аватар'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Игрок почта': user['Email'] || `${user['Ник']}@baza.ru`,
    };

    setAllMessages((prev) => [...prev, newMessage]);

    try {
      await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'ЧАТ',
          action: 'write',
          rowData: newMessage,
        }),
      });

      await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user['User ID'] || user['Telegram ID'] || user['Ник'],
          message: `💬 [ЧАТ] ${user['Ник']} -> ${activeThread.partnerName}: ${text}`,
        }),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto flex-1 h-[85vh]">
        <ChatWindow
          threads={threads}
          activeThread={activeThread}
          messages={filteredMessages}
          currentNick={user?.['Ник']}
          onSelectThread={(t) => setActiveThread(t)}
          onBackToThreads={() => setActiveThread(null)}
          onSendMessage={handleSendMessage}
        />
      </div>
    </AppLayout>
  );
}
