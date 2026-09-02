// Core business logic and calculations for poker club 'БАЗА'

/**
 * 1. Date Filtering function
 */
export function getDateFilters(date: Date) {
  return {
    Дата_Сегодня: date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate(),
    Дата_Месяц: date.getFullYear() * 100 + (date.getMonth() + 1),
    Дата_Сезон: Math.ceil((date.getMonth() + 1) / 3),
    Дата_Год: date.getFullYear(),
  };
}

export function isDateInPeriod(dateInput: Date | string, period: string): boolean {
  if (!dateInput) return false;

  let date: Date;
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Support DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}/.test(trimmed)) {
      const parts = trimmed.split(' ')[0].split('.');
      date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    } else {
      date = new Date(trimmed);
    }
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) return false;

  const now = new Date();
  const filters = getDateFilters(now);
  const rowFilters = getDateFilters(date);

  const p = (period || '').trim().toLowerCase();
  if (p === 'today' || p === 'сегодня') return rowFilters.Дата_Сегодня === filters.Дата_Сегодня;
  if (p === 'month' || p === 'месяц') return rowFilters.Дата_Месяц === filters.Дата_Месяц;
  if (p === 'season' || p === 'сезон') return rowFilters.Дата_Сезон === filters.Дата_Сезон;
  if (p === 'year' || p === 'год') return rowFilters.Дата_Год === filters.Дата_Год;
  return true;
}

export function getBasePointsForPlace(place: number): number {
  const basePointsMap: Record<number, number> = {
    1: 100,
    2: 80,
    3: 65,
    4: 50,
    5: 40,
    6: 30,
    7: 25,
    8: 20,
    9: 15,
    10: 10,
  };
  return basePointsMap[place] || Math.max(1, 10 - (place - 10));
}

export function calculateRatingPoints(place: number, totalPlayers: number): number {
  const coefficients: Record<number, number> = {
    1: 0.70,
    2: 0.80,
    3: 0.90,
    4: 1.00,
    5: 1.10,
  };

  const basePoints = getBasePointsForPlace(place);
  const coefficient = coefficients[totalPlayers] || 1.0;

  return Math.round(basePoints * coefficient);
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

export function getNextThreshold(
  userTotal: number,
  thresholds: { first: number; second: number; third: number; fourth: number }
): number {
  if (userTotal < thresholds.first) return thresholds.first;
  if (userTotal < thresholds.second) return thresholds.second;
  if (userTotal < thresholds.third) return thresholds.third;
  if (userTotal < thresholds.fourth) return thresholds.fourth;
  return thresholds.fourth;
}

export const determineRewardLevel = getRewardLevel;

/**
 * Check Nickname Uniqueness in players list
 */
export function checkNicknameUniqueness(nick: string, players: any[] = []): boolean {
  if (!nick || !nick.trim()) return false;
  const target = nick.trim().toLowerCase();
  return !players.some((p) => (p['Ник'] || p['nick'] || '').trim().toLowerCase() === target);
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

/**
 * 5. Bounty Calculation
 */
export function calculateBountyPoints(type: string, quantity: number): number {
  const pointsPerType: { [key: string]: number } = {
    'Выбил игрока': 10,
    'Выбил вице чемпиона': 20,
    'Выбил чемпиона': 30,
  };

  return (pointsPerType[type] || 10) * quantity;
}

/**
 * 6. Google Calendar Link Generator
 */
export function generateCalendarLink(startDateVal: string | Date, endDateVal: string | Date, title: string): string {
  const formatDate = (d: Date) => {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00Z`;
  };

  const startD = new Date(startDateVal);
  const endD = new Date(endDateVal);

  if (isNaN(startD.getTime())) return '#';
  const validEndD = isNaN(endD.getTime()) ? new Date(startD.getTime() + 3600000 * 3) : endD;

  const start = formatDate(startD);
  const end = formatDate(validEndD);
  const eventTitle = encodeURIComponent(title || 'Турнир ПК БАЗА');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${start}/${end}`;
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
