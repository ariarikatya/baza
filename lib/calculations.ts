// Core business logic and calculations for poker club 'БАЗА'

/**
 * 1. Date Filtering function
 */
export function isDateInPeriod(dateStr: string, period: 'today' | 'month' | 'season' | 'year'): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  if (isNaN(date.getTime())) return false;
  if (period === 'today') return date.toDateString() === now.toDateString();
  if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (period === 'season') return Math.ceil((date.getMonth() + 1) / 3) === Math.ceil((now.getMonth() + 1) / 3);
  if (period === 'year') return date.getFullYear() === now.getFullYear();
  return true;
}

/**
 * 2. Rating Calculation (Rollup replacement)
 */
export function calculatePlayerRating(
  nick: string,
  period: 'today' | 'month' | 'season' | 'year' | 'all',
  games: any[] = [],
  bounties: any[] = [],
  tasks: any[] = []
): number {
  if (!nick) return 0;
  const targetNick = nick.trim().toLowerCase();

  let gamesSum = 0;
  if (Array.isArray(games)) {
    for (const game of games) {
      const gNick = game['Ник']?.trim().toLowerCase();
      if (gNick === targetNick) {
        const dateStr = game['Дата'];
        if (period === 'all' || isDateInPeriod(dateStr, period)) {
          gamesSum += Number(game['Начислено']) || 0;
        }
      }
    }
  }

  let bountiesSum = 0;
  if (Array.isArray(bounties)) {
    for (const bounty of bounties) {
      const bNick = (bounty['Ник'] || bounty['Игрок'])?.trim().toLowerCase();
      if (bNick === targetNick) {
        const dateStr = bounty['Дата'] || bounty['Дата и время'];
        if (period === 'all' || isDateInPeriod(dateStr, period)) {
          bountiesSum += Number(bounty['Баллы']) || Number(bounty['Баллы из баунти']) || Number(bounty['Кол-во']) || 0;
        }
      }
    }
  }

  let tasksSum = 0;
  if (Array.isArray(tasks)) {
    for (const task of tasks) {
      const tNick = (task['Ник'] || task['Игрок'])?.trim().toLowerCase();
      if (tNick === targetNick) {
        const dateStr = task['Дата'] || task['Дата и время'];
        if (period === 'all' || isDateInPeriod(dateStr, period)) {
          tasksSum += Number(task['Баллы']) || Number(task['Баллы из заданий']) || 0;
        }
      }
    }
  }

  return gamesSum + bountiesSum + tasksSum;
}

/**
 * 3. Reward Level Determination
 */
export function getRewardLevel(
  userTotal: number,
  thresholds: { l1: number; l2: number; l3: number; l4: number }
): number {
  if (userTotal >= thresholds.l4) return 4;
  if (userTotal >= thresholds.l3) return 3;
  if (userTotal >= thresholds.l2) return 2;
  if (userTotal >= thresholds.l1) return 1;
  return 0;
}

/**
 * 4. Chat Threading
 */
export interface ChatThread {
  partnerEmail: string;
  partnerName: string;
  partnerAvatar?: string;
  lastMessage: string;
  lastTime: string;
  unreadCount?: number;
}

export function groupChatThreads(messages: any[] = [], currentUserEmail: string = ''): ChatThread[] {
  if (!currentUserEmail) return [];
  const myEmail = currentUserEmail.trim().toLowerCase();

  const groups: {
    [partnerEmail: string]: {
      partnerEmail: string;
      partnerName: string;
      partnerAvatar: string;
      lastMessage: string;
      lastTime: string;
      unreadCount: number;
      lastMsgObj: any;
    };
  } = {};

  if (Array.isArray(messages)) {
    for (const msg of messages) {
      const senderEmail = (msg['Игрок почта'] || msg['Email'] || '').trim().toLowerCase();
      const recipientEmail = (msg['Кому? От кого?'] || '').trim().toLowerCase();

      if (!senderEmail && !recipientEmail) continue;

      let partnerEmail = '';
      let partnerName = '';
      let partnerAvatar = '';

      if (senderEmail === myEmail) {
        partnerEmail = recipientEmail;
        partnerName = recipientEmail.split('@')[0] || recipientEmail;
      } else if (recipientEmail === myEmail || recipientEmail === 'всем' || !recipientEmail) {
        partnerEmail = senderEmail;
        partnerName = msg['Игрок'] || senderEmail;
        partnerAvatar = msg['Игрок фото'] || msg['Аватар'] || '';
      }

      if (!partnerEmail) continue;

      if (!groups[partnerEmail]) {
        groups[partnerEmail] = {
          partnerEmail,
          partnerName: partnerName || partnerEmail,
          partnerAvatar: partnerAvatar || msg['Игрок фото'] || '',
          lastMessage: msg['Сообщение'] || '',
          lastTime: msg['Дата и время отправки'] || '',
          unreadCount: 0,
          lastMsgObj: msg,
        };
      } else {
        const existingTime = new Date(groups[partnerEmail].lastMsgObj['Дата и время отправки'] || 0).getTime();
        const newTime = new Date(msg['Дата и время отправки'] || 0).getTime();
        if (newTime >= existingTime) {
          groups[partnerEmail].lastMsgObj = msg;
          groups[partnerEmail].lastMessage = msg['Сообщение'] || '';
          groups[partnerEmail].lastTime = msg['Дата и время отправки'] || '';
          if (partnerAvatar) groups[partnerEmail].partnerAvatar = partnerAvatar;
          if (partnerName) groups[partnerEmail].partnerName = partnerName;
        }
      }
    }
  }

  return Object.values(groups).map((g) => ({
    partnerEmail: g.partnerEmail,
    partnerName: g.partnerName,
    partnerAvatar: g.partnerAvatar,
    lastMessage: g.lastMessage,
    lastTime: g.lastTime,
    unreadCount: g.unreadCount,
  }));
}
