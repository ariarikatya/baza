// Core business logic and calculations for poker club 'БАЗА'

/**
 * 1. Date Filtering function
 */
export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')
    .trim()
    .toLowerCase();
}

export function parseGameDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const ruMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 0;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    const seconds = ruMatch[6] ? parseInt(ruMatch[6], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const parseFullDateTime = parseGameDate;

export function getDateFilters(date: Date) {
  return {
    Дата_Сегодня: date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate(),
    Дата_Месяц: date.getFullYear() * 100 + (date.getMonth() + 1),
    Дата_Сезон: date.getFullYear() * 10 + Math.ceil((date.getMonth() + 1) / 3),
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
          bountiesSum += Number(bounty['Баллы']) || 0;
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
          tasksSum += Number(task['Баллы']) || 0;
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

/**
 * Unified Game Exit and Completion Helpers
 */
export function isExited(row: Record<string, any>): boolean {
  if (!row) return false;
  let val = row['Вышел?'] ?? row['Вышел'];
  if (val === undefined) {
    const foundKey = Object.keys(row).find((k) => {
      const norm = normalizeName(k);
      return norm === 'вышел' || norm === 'вышел?';
    });
    if (foundKey) val = row[foundKey];
  }
  if (val === true) return true;
  if (!val) return false;
  const str = String(val).trim().toLowerCase();
  return ['true', 'да', 'yes', 'da', 'y', '1', '✓', '✔'].includes(str);
}

export function isPlayerPlaceFilled(row: Record<string, any>): boolean {
  if (!row) return false;
  let placeVal = row['Место'];
  if (placeVal === undefined) {
    const foundKey = Object.keys(row).find((k) => normalizeName(k) === 'место');
    if (foundKey) placeVal = row[foundKey];
  }
  const placeStr = String(placeVal || '').trim();
  return placeStr !== '' && placeStr !== '-';
}

export function isGameDateCompleted(
  gameDateStr: string,
  gameDatesList: Array<Record<string, any>> = []
): boolean {
  if (!gameDateStr) return false;
  const targetParsed = parseGameDate(gameDateStr);
  const targetTime = targetParsed ? targetParsed.getTime() : null;

  const matched = gameDatesList.find((gd) => {
    const gdDate = gd['Дата'] || gd['Дата и Время'];
    if (!gdDate) return false;
    const gdParsed = parseGameDate(gdDate);
    if (targetTime !== null && gdParsed !== null) {
      return Math.abs(targetTime - gdParsed.getTime()) < 60000;
    }
    return String(gdDate).trim().toLowerCase() === String(gameDateStr).trim().toLowerCase();
  });

  if (!matched) return false;

  let val = matched['Завершено?'] ?? matched['Завершено'];
  if (val === undefined) {
    const foundKey = Object.keys(matched).find((k) => {
      const norm = normalizeName(k);
      return norm === 'завершено?' || norm === 'завершено';
    });
    if (foundKey) val = matched[foundKey];
  }
  if (val === true) return true;
  if (val === false || val === null || val === undefined) return false;
  const str = String(val).trim().toLowerCase();
  return ['true', 'да', 'yes', 'da', 'y', '1', '✓', '✔', 'истина'].includes(str);
}

export function isGameFinished(row: Record<string, any>): boolean {
  if (!row) return false;
  return isPlayerPlaceFilled(row) || isExited(row);
}

export function isMessageInThread(
  msg: Record<string, any>,
  myKeys: Set<string>,
  partnerKeys: Set<string>
): boolean {
  if (!msg) return false;

  const sender = String(msg['Отправитель'] || msg['От кого?'] || msg['Игрок'] || '').trim().toLowerCase();
  const recipient = String(msg['Получатель'] || msg['Кому?'] || '').trim().toLowerCase();

  if (!sender) return false;

  if (recipient === 'всем') {
    return partnerKeys.has('всем') || partnerKeys.has(sender);
  }

  if (!recipient) return false;

  const isSenderMe = myKeys.has(sender);
  const isRecipientMe = myKeys.has(recipient);

  if (isSenderMe && partnerKeys.has(recipient)) return true;
  if (isRecipientMe && partnerKeys.has(sender)) return true;

  return false;
}

export interface PlayerIdentity {
  canonicalNick: string;
  email: string;
  userId: string;
  rowId: string;
  avatar: string;
  role: string;
  allKeys: Set<string>;
}

export function buildPlayerIdentityMap(playersList: any[] = []): Map<string, PlayerIdentity> {
  const map = new Map<string, PlayerIdentity>();
  if (!Array.isArray(playersList)) return map;

  playersList.forEach((p) => {
    if (!p) return;
    const nick = String(p['Ник'] || '').trim();
    const email = String(p['Email'] || '').trim();
    const userId = String(p['User ID'] || '').trim();
    const rowId = String(p['🔒 Row ID'] || '').trim();
    const avatar = String(p['Аватар'] || '').trim();
    const role = String(p['Роль'] || '').trim();

    const canonicalNick = nick || email || userId || 'Игрок';
    const allKeys = new Set<string>();

    if (nick) allKeys.add(nick.toLowerCase());
    if (email) allKeys.add(email.toLowerCase());
    if (userId) allKeys.add(userId.toLowerCase());
    if (rowId) allKeys.add(rowId.toLowerCase());

    const identity: PlayerIdentity = {
      canonicalNick,
      email,
      userId,
      rowId,
      avatar,
      role,
      allKeys,
    };

    allKeys.forEach((key) => {
      if (!map.has(key)) {
        map.set(key, identity);
      }
    });
  });

  return map;
}

export function resolvePlayerIdentity(
  rawIdentifier: string,
  identityMap?: Map<string, PlayerIdentity>
): PlayerIdentity {
  const clean = String(rawIdentifier || '').trim();
  const lower = clean.toLowerCase();

  if (identityMap && identityMap.has(lower)) {
    return identityMap.get(lower)!;
  }

  return {
    canonicalNick: clean,
    email: clean.includes('@') ? clean : '',
    userId: '',
    rowId: '',
    avatar: '',
    role: '',
    allKeys: new Set([lower]),
  };
}

export function groupChatThreads(
  messages: any[] = [],
  currentUserEmail: string = '',
  currentUserNick: string = '',
  playersListOrMap?: any[] | Map<string, PlayerIdentity>,
  currentUserUserId?: string
): ChatThread[] {
  const myEmail = currentUserEmail ? currentUserEmail.trim().toLowerCase() : '';
  const myNick = currentUserNick ? currentUserNick.trim().toLowerCase() : '';
  const myUserId = currentUserUserId ? currentUserUserId.trim().toLowerCase() : '';

  if (!myEmail && !myNick && !myUserId) return [];

  const myKeys = new Set<string>();
  if (myEmail) myKeys.add(myEmail);
  if (myNick) myKeys.add(myNick);
  if (myUserId) myKeys.add(myUserId);

  let identityMap: Map<string, PlayerIdentity>;
  if (playersListOrMap instanceof Map) {
    identityMap = playersListOrMap;
  } else if (Array.isArray(playersListOrMap)) {
    identityMap = buildPlayerIdentityMap(playersListOrMap);
  } else {
    identityMap = new Map<string, PlayerIdentity>();
  }

  // Also ensure currentUser keys are mapped
  for (const key of Array.from(myKeys)) {
    if (identityMap.has(key)) {
      identityMap.get(key)!.allKeys.forEach((k) => myKeys.add(k));
    }
  }

  const groups: {
    [partnerKey: string]: {
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
      // Column A: Sender
      const sender = String(msg['Отправитель'] || msg['От кого?'] || msg['Игрок'] || '').trim();
      // Column B: Message
      const text = String(msg['Сообщение'] || '').trim();
      // Column C: Recipient
      const recipient = String(msg['Получатель'] || msg['Кому?'] || '').trim();
      const photo = String(msg['Игрок фото'] || msg['Фото'] || '').trim();
      const timeStr = String(msg['Дата и время отправки'] || msg['Дата'] || '');

      if (!sender && !recipient) {
        continue;
      }

      const sNorm = sender.toLowerCase();
      const rNorm = recipient.toLowerCase();

      const senderIdentity = resolvePlayerIdentity(sender, identityMap);
      const recipientIdentity = resolvePlayerIdentity(recipient, identityMap);

      const isSenderMe = myKeys.has(sNorm) || Array.from(senderIdentity.allKeys).some((k) => myKeys.has(k));
      const isRecipientMe =
        rNorm === 'всем' || (rNorm !== '' && (myKeys.has(rNorm) || Array.from(recipientIdentity.allKeys).some((k) => myKeys.has(k))));

      if (!isSenderMe && !isRecipientMe) continue;

      let partnerRaw: string;
      let partnerIdentity: PlayerIdentity;

      if (isSenderMe && !isRecipientMe) {
        if (!recipient) continue;
        partnerRaw = recipient;
        partnerIdentity = recipientIdentity;
      } else if (isRecipientMe && !isSenderMe) {
        partnerRaw = sender;
        partnerIdentity = senderIdentity;
      } else {
        partnerRaw = recipient || sender;
        partnerIdentity = recipientIdentity;
      }

      const partnerCanonicalName = partnerIdentity.canonicalNick || partnerRaw;
      const partnerCanonicalKey = partnerCanonicalName.toLowerCase();
      if (!partnerCanonicalKey) continue;

      const displayMessage = text || 'Диалог';
      const msgTimestamp = parseFullDateTime(timeStr)?.getTime() || 0;

      if (!groups[partnerCanonicalKey]) {
        groups[partnerCanonicalKey] = {
          partnerEmail: partnerIdentity.email || partnerCanonicalName,
          partnerName: partnerCanonicalName,
          partnerAvatar: photo || partnerIdentity.avatar,
          lastMessage: displayMessage,
          lastTime: timeStr,
          unreadCount: 0,
          lastMsgObj: msg,
        };
      } else {
        const existingTime = parseFullDateTime(
          groups[partnerCanonicalKey].lastMsgObj['Дата и время отправки'] ||
            groups[partnerCanonicalKey].lastMsgObj['Дата'] ||
            ''
        )?.getTime() || 0;

        if (msgTimestamp >= existingTime) {
          groups[partnerCanonicalKey].lastMsgObj = msg;
          groups[partnerCanonicalKey].lastMessage = displayMessage;
          groups[partnerCanonicalKey].lastTime = timeStr;
          if (photo || partnerIdentity.avatar) {
            groups[partnerCanonicalKey].partnerAvatar = photo || partnerIdentity.avatar;
          }
          if (partnerCanonicalName) {
            groups[partnerCanonicalKey].partnerName = partnerCanonicalName;
          }
        }
      }
    }
  }

  return Object.values(groups)
    .sort((a, b) => {
      const tA = parseFullDateTime(a.lastTime)?.getTime() || 0;
      const tB = parseFullDateTime(b.lastTime)?.getTime() || 0;
      return tB - tA;
    })
    .map((g) => ({
      partnerEmail: g.partnerEmail,
      partnerName: g.partnerName,
      partnerAvatar: g.partnerAvatar,
      lastMessage: g.lastMessage,
      lastTime: g.lastTime,
      unreadCount: g.unreadCount,
    }));
}
