'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/AppLayout';
import { ChatWindow, ConversationThread } from '@/components/ChatWindow';
import { ChatRow, PlayerRow, formatRussianDate } from '@/types';
import { groupChatThreads, buildPlayerIdentityMap, resolvePlayerIdentity, isMessageInThread } from '@/lib/calculations';
import { useRequireSession } from '@/lib/useRequireSession';

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useRequireSession();
  const [allMessages, setAllMessages] = useState<ChatRow[]>([]);
  const [pendingMessages, setPendingMessages] = useState<(ChatRow & { _id: string; _timestamp: number; _status?: 'sending' | 'failed' })[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [rolePlayers, setRolePlayers] = useState<PlayerRow[]>([]);
  const [allPlayersMap, setAllPlayersMap] = useState<Map<string, PlayerRow>>(new Map());

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
            const email = String(p['Email'] || '').trim().toLowerCase();
            if (email && !map.has(email)) map.set(email, p);
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
    if (user) {
      fetchRolePlayers();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/sheets?sheet=Чаты');
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        const serverMsgs: ChatRow[] = json.data;
        setAllMessages(serverMsgs);

        // Filter out pending messages confirmed by server or expired (> 60s)
        setPendingMessages((prevPending) => {
          const now = Date.now();
          return prevPending.filter((pending) => {
            const age = now - pending._timestamp;
            if (age > 60000) {
              console.warn('[chat] Cleared unconfirmed pending message after 60s timeout:', pending);
              return false;
            }

            const pendingText = String(pending['Сообщение'] || '').trim();
            const pendingSender = String(pending['Отправитель'] || pending['Игрок'] || '').trim().toLowerCase();
            const pendingRecipient = String(pending['Получатель'] || pending['Кому?'] || '').trim().toLowerCase();

            const isConfirmedOnServer = serverMsgs.some((sMsg) => {
              const sText = String(sMsg['Сообщение'] || '').trim();
              const sSender = String(sMsg['Отправитель'] || sMsg['От кого?'] || sMsg['Игрок'] || '').trim().toLowerCase();
              const sRecipient = String(sMsg['Получатель'] || sMsg['Кому?'] || '').trim().toLowerCase();

              return (
                sText === pendingText &&
                sSender === pendingSender &&
                sRecipient === pendingRecipient
              );
            });

            return !isConfirmedOnServer;
          });
        });
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const myEmail = (user['Email'] || '').trim().toLowerCase();
    const myNick = (user['Ник'] || '').trim().toLowerCase();
    const myUserId = (user['User ID'] || '').trim().toLowerCase();

    const combined = [...allMessages, ...pendingMessages];
    const playersList = Array.from(allPlayersMap.values());
    const grouped = groupChatThreads(combined, myEmail, myNick, playersList, myUserId);

    const mappedThreads: ConversationThread[] = grouped.map((t) => ({
      partnerEmail: t.partnerEmail,
      partnerName: t.partnerName,
      partnerAvatar: t.partnerAvatar,
      lastMessage: t.lastMessage,
      lastTime: formatRussianDate(t.lastTime),
    }));

    setThreads(mappedThreads);
  }, [allMessages, pendingMessages, user, allPlayersMap]);

  const combinedMessages = [...allMessages, ...pendingMessages];

  const filteredMessages = combinedMessages.filter((msg) => {
    if (!user || !activeThread) return false;
    const myEmail = (user['Email'] || '').trim().toLowerCase();
    const myNick = (user['Ник'] || '').trim().toLowerCase();
    const myUserId = (user['User ID'] || '').trim().toLowerCase();

    const myKeys = new Set<string>();
    if (myNick) myKeys.add(myNick);
    if (myEmail) myKeys.add(myEmail);
    if (myUserId) myKeys.add(myUserId);

    const playersList = Array.from(allPlayersMap.values());
    const identityMap = buildPlayerIdentityMap(playersList);
    for (const key of Array.from(myKeys)) {
      if (identityMap.has(key)) {
        identityMap.get(key)!.allKeys.forEach((k) => myKeys.add(k));
      }
    }

    const partnerName = (activeThread.partnerName || '').trim().toLowerCase();
    const partnerEmail = (activeThread.partnerEmail || '').trim().toLowerCase();

    const partnerKeys = new Set<string>();
    if (partnerName) partnerKeys.add(partnerName);
    if (partnerEmail) partnerKeys.add(partnerEmail);

    for (const key of Array.from(partnerKeys)) {
      if (identityMap.has(key)) {
        identityMap.get(key)!.allKeys.forEach((k) => partnerKeys.add(k));
      }
    }

    return isMessageInThread(msg, myKeys, partnerKeys);
  });

  const handleStartChat = (player: PlayerRow) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const playerNick = String(player['Ник'] || '').trim();
    const playerEmail = String(player['Email'] || '').trim();
    const canonicalName = playerNick || playerEmail || 'Игрок';

    const existingThread = threads.find((t) => {
      const pName = t.partnerName.trim().toLowerCase();
      const pEmail = t.partnerEmail.trim().toLowerCase();
      return (
        (playerNick && (pName === playerNick.toLowerCase() || pEmail === playerNick.toLowerCase())) ||
        (playerEmail && (pName === playerEmail.toLowerCase() || pEmail === playerEmail.toLowerCase()))
      );
    });

    if (existingThread) {
      setActiveThread(existingThread);
    } else {
      const newThread: ConversationThread = {
        partnerEmail: playerEmail || playerNick,
        partnerName: canonicalName,
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
    const senderName = myNick || myEmail;

    let targetKey = String(activeThread.partnerName || activeThread.partnerEmail || '').trim();
    let recipientPlayerObj = allPlayersMap.get(targetKey.toLowerCase());
    const canonicalRecipientNick = String(
      recipientPlayerObj?.['Ник'] || activeThread.partnerName || activeThread.partnerEmail || ''
    ).trim();

    const recipientAvatar = String(recipientPlayerObj?.['Аватар'] || activeThread.partnerAvatar || '');
    const nowIso = new Date().toISOString();
    const pendingId = `pending_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newMessage: ChatRow & { _id: string; _timestamp: number } = {
      _id: pendingId,
      _timestamp: Date.now(),
      'Отправитель': senderName,           // A
      'От кого?': senderName,              // A
      'Игрок': senderName,                 // A
      'Сообщение': String(text).trim(),     // B
      'Получатель': canonicalRecipientNick,// C: Canonical recipient nick!
      'Кому?': canonicalRecipientNick,     // C
      'Дата и время отправки': nowIso,     // D
      'Дата': nowIso,
      'Игрок фото': recipientAvatar,       // E
      'Игрок почта': myEmail,              // F
      'Уведомление': 'Да',                 // H
    };

    setPendingMessages((prev) => [...prev, newMessage]);

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
        setPendingMessages((prev) =>
          prev.map((p) => (p._id === pendingId ? { ...p, _status: 'failed' } : p))
        );
      } else {
        fetch('/api/chat/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            recipientNick: canonicalRecipientNick,
            senderNick: senderName,
            text,
          }),
        }).catch((err) => console.error('Chat notify error:', err));
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setPendingMessages((prev) =>
        prev.map((p) => (p._id === pendingId ? { ...p, _status: 'failed' } : p))
      );
    }
  };

  const handleRetryMessage = async (failedMsg: ChatRow & { _id: string }) => {
    setPendingMessages((prev) =>
      prev.map((p) => (p._id === failedMsg._id ? { ...p, _status: 'sending' } : p))
    );

    const text = String(failedMsg['Сообщение'] || '').trim();
    const recipientNick = String(failedMsg['Получатель'] || failedMsg['Кому?'] || '').trim();
    const myNick = String(failedMsg['Отправитель'] || failedMsg['Игрок'] || '').trim();

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetName: 'Чаты',
          action: 'write',
          rowData: failedMsg,
        }),
      });

      const writeData = await res.json();
      if (!writeData.success) {
        setPendingMessages((prev) =>
          prev.map((p) => (p._id === failedMsg._id ? { ...p, _status: 'failed' } : p))
        );
      } else {
        fetch('/api/chat/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientNick,
            senderNick: myNick,
            text,
          }),
        }).catch((err) => console.error('Chat notify error:', err));
      }
    } catch (err) {
      setPendingMessages((prev) =>
        prev.map((p) => (p._id === failedMsg._id ? { ...p, _status: 'failed' } : p))
      );
    }
  };

  if (sessionLoading || !user) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-slate-400">Загрузка чата...</div>
      </AppLayout>
    );
  }

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
          onRetryMessage={handleRetryMessage}
          onStartChat={handleStartChat}
        />
      </div>
    </AppLayout>
  );
}
