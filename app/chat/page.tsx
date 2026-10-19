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
  const [ddPlayers, setDdPlayers] = useState<PlayerRow[]>([]);

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

  useEffect(() => {
    async function fetchDdPlayers() {
      try {
        const res = await fetch('/api/sheets?sheet=Игроки');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const filtered = json.data.filter((p: PlayerRow) =>
            String(p['Роль'] || '').includes('D:D')
          );
          setDdPlayers(filtered);
        }
      } catch (err) {
        console.error('Failed to load D:D players:', err);
      }
    }
    fetchDdPlayers();
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
    const myEmail = (user['Email'] || '').trim().toLowerCase();
    const myNick = (user['Ник'] || '').trim().toLowerCase();

    const grouped = groupChatThreads(allMessages, myEmail, myNick);

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

  // Filter messages strictly according to table headers A-F for active user
  const filteredMessages = allMessages.filter((msg) => {
    if (!user || !activeThread) return false;
    const myEmail = (user['Email'] || '').trim().toLowerCase();
    const myNick = (user['Ник'] || '').trim().toLowerCase();
    const partnerKey = activeThread.partnerEmail.trim().toLowerCase();

    const senderNick = String(msg['Игрок'] || '').trim().toLowerCase();
    const senderEmail = String(msg['От кого?'] || msg['Игрок почта'] || '').trim().toLowerCase();
    const recipient = String(msg['Кому?'] || '').trim().toLowerCase();

    const isSenderMe = (myEmail && senderEmail === myEmail) || (myNick && senderNick === myNick);
    const isRecipientMe = (myEmail && recipient === myEmail) || (myNick && recipient === myNick) || recipient === 'всем';

    if (isSenderMe) {
      return recipient === partnerKey;
    }
    if (isRecipientMe) {
      return senderEmail === partnerKey || senderNick === partnerKey;
    }

    return false;
  });

  const handleStartDdChat = (player: PlayerRow) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const playerEmail = String(player['Email'] || player['Ник'] || '').trim();
    const playerNick = String(player['Ник'] || '').trim();

    const existingThread = threads.find((t) => {
      const partner = t.partnerEmail.trim().toLowerCase();
      return (
        partner === playerEmail.toLowerCase() ||
        partner === playerNick.toLowerCase() ||
        t.partnerName.trim().toLowerCase() === playerNick.toLowerCase()
      );
    });

    if (existingThread) {
      setActiveThread(existingThread);
    } else {
      const newThread: ConversationThread = {
        partnerEmail: playerEmail || playerNick,
        partnerName: playerNick,
        partnerAvatar: player['Аватар'],
        lastMessage: 'Начните диалог...',
        lastTime: new Date().toISOString(),
      };
      setActiveThread(newThread);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !activeThread) {
      router.push('/login');
      return;
    }

    const myEmail = String(user['Email'] || '').trim();
    const myNick = String(user['Ник'] || '').trim();
    const targetRecipient = String(activeThread.partnerEmail || '').trim();

    const senderField = myEmail || myNick;

    const newMessage: ChatRow = {
      'Игрок': String(myNick),
      'Сообщение': String(text),
      'Кому?': String(targetRecipient),
      'От кого?': String(senderField),
      'Дата и время отправки': String(new Date().toISOString()),
      'Игрок фото': String(user['Аватар'] || ''),
      'Игрок почта': String(myEmail),
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
          ddPlayers={user ? ddPlayers : []}
          onSelectThread={(t) => setActiveThread(t)}
          onBackToThreads={() => setActiveThread(null)}
          onSendMessage={handleSendMessage}
          onStartDdChat={handleStartDdChat}
        />
      </div>
    </AppLayout>
  );
}
