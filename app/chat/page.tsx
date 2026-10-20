'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ChatWindow, ConversationThread } from '@/components/ChatWindow';
import { ChatRow, PlayerRow, formatRussianDate } from '@/types';
import { groupChatThreads } from '@/lib/calculations';
import { getSavedUserSession, restoreUserSessionAsync } from '@/lib/session';

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<PlayerRow | null>(null);
  const [allMessages, setAllMessages] = useState<ChatRow[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [rolePlayers, setRolePlayers] = useState<PlayerRow[]>([]);
  const [allPlayersMap, setAllPlayersMap] = useState<Map<string, PlayerRow>>(new Map());

  useEffect(() => {
    const saved = getSavedUserSession();
    if (saved) {
      setUser(saved);
    } else {
      restoreUserSessionAsync().then((restored) => {
        if (restored) {
          setUser(restored);
        } else {
          router.push('/login');
        }
      });
    }
  }, [router]);

  useEffect(() => {
    async function fetchRolePlayers() {
      if (!user) return;
      try {
        const res = await fetch('/api/sheets?sheet=Игроки');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const map = new Map<string, PlayerRow>();
          json.data.forEach((p: PlayerRow) => {
            const nick = String(p['Ник'] || '').trim().toLowerCase();
            if (nick) map.set(nick, p);
          });
          setAllPlayersMap(map);

          const myRole = String(user['Роль'] || '').trim();
          const isUserWithRole = myRole !== '';

          const filtered = json.data.filter((p: PlayerRow) => {
            const role = String(p['Роль'] || '').trim();
            const isBanned = p['Бан'] === true || String(p['Бан'] || '').toLowerCase() === 'true';
            const isUnauth = p['Авторизован?'] === false || String(p['Авторизован?'] || '').toLowerCase() === 'false';
            const isMe = (
              (user['User ID'] && p['User ID'] === user['User ID']) ||
              (user['Ник'] && p['Ник']?.trim().toLowerCase() === user['Ник'].trim().toLowerCase())
            );

            if (isBanned || isUnauth || isMe) return false;

            // If current user has a NON-EMPTY role (owner/admin): can chat with ANY player in "Игроки"
            // If current user has an EMPTY role (regular player): can ONLY start chat with non-empty role contacts
            if (isUserWithRole) {
              return true;
            } else {
              return role !== '';
            }
          });
          setRolePlayers(filtered);
        }
      } catch (err) {
        console.error('Failed to load available chat players:', err);
      }
    }
    fetchRolePlayers();
  }, [user]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/sheets?sheet=Чаты');
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

  // Filter messages strictly according to sheet 'Чаты' (A=Sender, B=Message, C=Recipient)
  const filteredMessages = allMessages.filter((msg) => {
    if (!user || !activeThread) return false;
    const myEmail = (user['Email'] || '').trim().toLowerCase();
    const myNick = (user['Ник'] || '').trim().toLowerCase();
    const partnerKey = (activeThread.partnerName || activeThread.partnerEmail || '').trim().toLowerCase();

    // Column A: Sender nickname
    const sender = String(msg['Отправитель'] || msg['От кого?'] || msg['Игрок'] || '').trim().toLowerCase();
    // Column C: Recipient nickname
    const recipient = String(msg['Получатель'] || msg['Кому?'] || '').trim().toLowerCase();

    // Filter out rows with empty recipient (A) or empty sender (C)
    if (!recipient || !sender) return false;

    const isSenderMe = (myNick && sender === myNick) || (myEmail && sender === myEmail);
    const isRecipientMe = (myNick && recipient === myNick) || (myEmail && recipient === myEmail) || recipient === 'всем';

    if (isSenderMe) {
      return recipient === partnerKey;
    }
    if (isRecipientMe) {
      return sender === partnerKey;
    }

    return false;
  });

  const handleStartChat = (player: PlayerRow) => {
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
    const recipientNick = String(activeThread.partnerName || activeThread.partnerEmail || '').trim();

    // Look up recipient player avatar strictly from 'Игроки' sheet
    const recipientPlayerObj = allPlayersMap.get(recipientNick.toLowerCase());
    const recipientAvatar = String(recipientPlayerObj?.['Аватар'] || activeThread.partnerAvatar || '');

    const newMessage: ChatRow = {
      'Отправитель': myNick,               // A: Ник отправителя
      'От кого?': myNick,                  // A: Ник отправителя
      'Игрок': myNick,                     // A: Ник отправителя
      'Сообщение': String(text),            // B: Сообщение
      'Получатель': recipientNick,         // C: Ник получателя
      'Кому?': recipientNick,              // C: Ник получателя
      'Дата и время отправки': new Date().toISOString(), // D: Дата и время
      'Игрок фото': recipientAvatar,       // E: Фото получателя из Игроки
      'Игрок почта': myEmail,
      'Уведомление': 'Да',                 // H: «Да» если не отправлено -> после отправки «✓»
    };

    setAllMessages((prev) => [...prev, newMessage]);

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Чаты',
          action: 'write',
          rowData: newMessage,
        }),
      });

      const writeData = await res.json();
      if (!writeData.success) {
        console.error('Failed to write message to Чаты:', writeData.error);
        alert(`Ошибка при отправке сообщения в таблицу: ${writeData.error || 'Неизвестная ошибка'}`);
      }

      // Fire-and-forget push/telegram delivery and update H:H flag to '✓'
      fetch('/api/chat/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientNick,
          senderNick: myNick,
          text,
        }),
      }).catch((err) => console.error('Chat notify error:', err));
    } catch (err: any) {
      console.error('Error sending message:', err);
      alert(`Сбой сети при отправке сообщения: ${err?.message || err}`);
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
          currentRole={user?.['Роль']}
          rolePlayers={user ? rolePlayers : []}
          onSelectThread={(t) => setActiveThread(t)}
          onBackToThreads={() => setActiveThread(null)}
          onSendMessage={handleSendMessage}
          onStartChat={handleStartChat}
        />
      </div>
    </AppLayout>
  );
}
