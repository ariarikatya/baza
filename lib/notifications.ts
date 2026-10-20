import {
  readSheetRawDisplayValues,
  readSheetRawValues,
  readSheet,
  updateCell,
  clearCell,
  appendRowValues,
} from '@/lib/googleSheets';
import { sendWebPushNotification, broadcastWebPush } from '@/lib/webPush';

// ═══════════════════════════════════════════════════════════════════
// ═══ НАСТРОЙКИ ═══
// ═══════════════════════════════════════════════════════════════════
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const APP_URL = process.env.NOTIFICATIONS_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://baza64.glide.page';

export const SHEETS = {
  DAILY_GAMES: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
  GAME_DATES: 'Даты ежедневных игр',
  REWARDS: 'Начисление наград',
  BOUNTY: '💰 БАУНТИ',
  PLAYERS: 'Игроки',
  NEWS: 'НОВОСТИ',
  PROMOTIONS: 'АКЦИИ',
  SEASONS: 'СЕЗОННЫЕ ТУРНИРЫ',
  CLUB: 'КЛУБ',
  IN_CLUB: 'В КЛУБЕ',
  NEWS_COMMENTS: 'КОММЕНТАРИИ НОВОСТЕЙ',
} as const;

export const COLS = {
  DAILY_GAMES: {
    DATE: 1,            // Col A
    NICK: 2,            // Col B
    PLACE: 3,           // Col C
    PCOUNT: 4,          // Col D
    POINTS: 6,          // Col F
    TELEGRAM_ID: 9,     // Col I
    INVITATION_SENT: 12, // Col L
    RESULT_SENT: 13,    // Col M
    IS_EXITED: 14,      // Col N
    CHIPS_BOUGHT: 17,   // Col Q
    ROTHSCHILD: 22,     // Col V
    EXIT_TIME: 23,      // Col W
  },
  GAME_DATES: {
    DATE_TIME: 1,       // Col A
    IS_COMPLETED: 3,    // Col C
    NOTIFIED: 8,        // Col H
    STATUS: 9,          // Col I
    NOTIFIED_ABSENT: 10, // Col J
    DESC_K: 11,         // Col K
    ANNOUNCED: 14,      // Col N
    IMAGE_URL: 15,      // Col O
    DESC_P: 16,         // Col P
  },
  PLAYERS: {
    NICK: 1,            // Col A
    TELEGRAM_ID: 9,     // Col I
  },
  NEWS: {
    // Columns: 0:Заголовок, 1:Текст, 2:Дата, 3:Автор, 4:Фото, 5:Уведомление
    FLAG_INDEX: 5,      // 0-based index (Col F)
  },
  PROMOTIONS: {
    // Columns: 0:Название, 1:Описание, 2:Дата начала, 3:Дата окончания, 4:Уведомление, 5:Картинка
    FLAG_INDEX: 4,      // 0-based index (Col E)
  },
  SEASONS: {
    // Columns: 0:Название, 1:Дата начала, 2:Дата окончания, 3:Взнос, 4:Статус, 5:Описание, 6:Фото, 7:Предоплата?, 8:Уведомление, 9:Завершить турнир
    FLAG_INDEX: 8,      // 0-based index (Col I)
  },
  BOUNTY: {
    DATE: 1,            // Col A
    NICK: 2,            // Col B
    TARGET: 3,          // Col C
    POINTS: 5,          // Col E
    STATUS: 7,          // Col G
  },
} as const;

export const TIME_THRESHOLDS = {
  INVITATION_MIN_HOURS: 1.5,
  INVITATION_MAX_HOURS: 2.5,
};

export const ANNOUNCEMENT_HOUR = 16;

// ═══════════════════════════════════════════════════════════════════
// СЕРВИСНЫЕ ФУНКЦИИ И РАБОТА С ДАТАМИ
// ═══════════════════════════════════════════════════════════════════

export function parseFullDateTime(str: any): Date {
  if (!str) return new Date(0);
  if (str instanceof Date) return isNaN(str.getTime()) ? new Date(0) : str;
  try {
    const s = String(str).trim();
    if (!s) return new Date(0);

    const num = Number(s);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      return new Date(Math.round((num - 25569) * 86400 * 1000));
    }

    const ruMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ruMatch) {
      return new Date(
        parseInt(ruMatch[3], 10),
        parseInt(ruMatch[2], 10) - 1,
        parseInt(ruMatch[1], 10),
        ruMatch[4] ? parseInt(ruMatch[4], 10) : 0,
        ruMatch[5] ? parseInt(ruMatch[5], 10) : 0,
        ruMatch[6] ? parseInt(ruMatch[6], 10) : 0
      );
    }

    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1], 10),
        parseInt(isoMatch[2], 10) - 1,
        parseInt(isoMatch[3], 10),
        isoMatch[4] ? parseInt(isoMatch[4], 10) : 0,
        isoMatch[5] ? parseInt(isoMatch[5], 10) : 0,
        isoMatch[6] ? parseInt(isoMatch[6], 10) : 0
      );
    }
  } catch (e) {}
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

export function normalizeDateString(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  const match = s.match(/(\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2})/);
  if (match) return match[1];
  const parsed = parseFullDateTime(s);
  if (parsed.getTime() > 0) {
    return formatDateInTz(parsed, 'dd.MM.yyyy HH:mm');
  }
  return s;
}

export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function cleanNotificationValue(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  // Exclude bare numeric strings (e.g. raw Excel serial dates like 46056 or 46056.5)
  if (/^\d+(\.\d+)?$/.test(str)) return '';
  // Exclude flag values
  const upper = str.toUpperCase();
  if (['ДА', 'DA', 'YES', 'Y', '1', '2', 'TRUE', '✓', '✔'].includes(upper)) return '';
  return str;
}

export function extractTitleAndText(row: any[], headers: any[]): { title: string; text: string } {
  if (!row || !Array.isArray(row)) return { title: '', text: '' };

  const normHeaders = (headers || []).map((h) => String(h || '').trim().toLowerCase());

  let titleIdx = normHeaders.findIndex(
    (h) => h === 'заголовок' || h === 'название' || h.startsWith('заголовок') || h.startsWith('название')
  );
  let textIdx = normHeaders.findIndex(
    (h) => h === 'текст' || h === 'описание' || h.startsWith('текст') || h.startsWith('описание')
  );

  let title = titleIdx !== -1 ? cleanNotificationValue(row[titleIdx]) : '';
  let text = textIdx !== -1 ? cleanNotificationValue(row[textIdx]) : '';

  // Fallback: if dynamic header lookup did not yield values, scan row cells
  if (!title || !text) {
    const candidates: string[] = [];
    for (let col = 0; col < row.length; col++) {
      if (col === titleIdx || col === textIdx) continue;
      const hName = normHeaders[col] || '';
      if (
        hName.includes('уведомлен') ||
        hName.includes('завершить') ||
        hName.includes('предоплата') ||
        hName.includes('автор') ||
        hName.includes('фото') ||
        hName.includes('картинка') ||
        hName.includes('изображение') ||
        hName.includes('дата')
      ) {
        continue;
      }

      const cleaned = cleanNotificationValue(row[col]);
      if (cleaned) {
        candidates.push(cleaned);
      }
    }

    if (!title && candidates.length > 0) {
      title = candidates.shift() || '';
    }
    if (!text && candidates.length > 0) {
      text = candidates.shift() || '';
    }
  }

  return { title, text };
}

export function getGameStartMs(rawDateStr: any): number | null {
  if (!rawDateStr) return null;
  const s = String(rawDateStr).trim();
  if (!s) return null;

  const ruMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = parseInt(ruMatch[4], 10);
    const minutes = parseInt(ruMatch[5], 10);
    // Return UTC timestamp considering MSK wall-clock time offset (UTC+3)
    return Date.UTC(year, month, day, hours - 3, minutes);
  }

  const d = parseFullDateTime(s);
  return d && !isNaN(d.getTime()) && d.getTime() > 0 ? d.getTime() : null;
}

export function parseGameDateTime(dateStr: any): Date | null {
  if (!dateStr) return null;
  const ms = getGameStartMs(dateStr);
  return ms !== null ? new Date(ms) : null;
}

export function buildGameReminder12Registered(timeStr: string): string {
  return (
    `⏰ <b>Напоминание о игре!</b>\n\n` +
    `Вы записаны на турнир сегодня в <b>${escapeHtml(timeStr)}</b> (через 12 часов).\n` +
    `Ждем вас по адресу: Саратов, ул. Чапаева 73.\n\n` +
    `<a href="${APP_URL}/tournaments">Проверить запись</a>`
  );
}

export function buildGameReminder12NotRegistered(timeStr: string, regCloseTimeStr?: string): string {
  let regCloseBlock = '';
  if (regCloseTimeStr) {
    regCloseBlock = `\nРегистрация закрывается в <b>${escapeHtml(regCloseTimeStr)}</b>.\n`;
  }
  return (
    `🎰 <b>АНОНС ИГРЫ!</b>\n\n` +
    `Сегодня в <b>${escapeHtml(timeStr)}</b> состоится турнир! (через 12 часов).\n` +
    `${regCloseBlock}` +
    `Свободные места еще есть — успейте записаться!\n\n` +
    `<a href="${APP_URL}/tournaments">Записаться на игру</a>`
  );
}

export function buildGameReminder2Registered(timeStr: string): string {
  return (
    `⏰ <b>Игра скоро начнется!</b>\n\n` +
    `Вы записаны на турнир через 2 часа (в <b>${escapeHtml(timeStr)}</b>)!\n` +
    `Готовьтесь к игре. Адрес: Саратов, ул. Чапаева 73.\n\n` +
    `<a href="${APP_URL}/tournaments">Проверить карточку</a>`
  );
}

export function buildGameReminder2NotRegistered(timeStr: string): string {
  return (
    `🎰 <b>ПРИГЛАШЕНИЕ НА ИГРУ!</b>\n\n` +
    `Игра через 2 часа (в <b>${escapeHtml(timeStr)}</b>)!\n` +
    `Свободные места у стола еще есть — успейте зарегистрироваться!\n\n` +
    `<a href="${APP_URL}/tournaments">Зарегистрироваться</a>`
  );
}

export function formatTime(dateObj: Date): string {
  return (
    String(dateObj.getHours()).padStart(2, '0') +
    ':' +
    String(dateObj.getMinutes()).padStart(2, '0')
  );
}

function formatDateInTz(date: Date, formatStr: string = 'dd.MM.yyyy HH:mm'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const formatter = new Intl.DateTimeFormat('ru-RU', options);
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });

  const dd = map.day || String(date.getDate()).padStart(2, '0');
  const MM = map.month || String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = map.year || String(date.getFullYear());
  const HH = map.hour || String(date.getHours()).padStart(2, '0');
  const mm = map.minute || String(date.getMinutes()).padStart(2, '0');

  if (formatStr === 'dd.MM.yyyy') return `${dd}.${MM}.${yyyy}`;
  if (formatStr === 'HH:mm') return `${HH}:${mm}`;
  return `${dd}.${MM}.${yyyy} ${HH}:${mm}`;
}

export async function getPlayersWithTelegramId(): Promise<Array<{ nick: string; tgId: string }>> {
  const playersData = await readSheetRawValues(SHEETS.PLAYERS);
  if (!playersData || playersData.length < 2) return [];

  const headers = playersData[0] || [];
  let tgColIndex = headers.findIndex((h: any) => String(h || '').trim().toLowerCase() === 'telegram id');
  if (tgColIndex === -1) tgColIndex = COLS.PLAYERS.TELEGRAM_ID - 1;

  let nickColIndex = headers.findIndex((h: any) => String(h || '').trim().toLowerCase() === 'ник');
  if (nickColIndex === -1) nickColIndex = COLS.PLAYERS.NICK - 1;

  const result: Array<{ nick: string; tgId: string }> = [];
  for (let i = 1; i < playersData.length; i++) {
    const nick = String(playersData[i][nickColIndex] || '').trim();
    const tgId = String(playersData[i][tgColIndex] || '').trim();
    if (tgId) {
      result.push({ nick, tgId });
    }
  }

  return result;
}

export async function getNickToTgIdMap(): Promise<Record<string, string>> {
  const players = await getPlayersWithTelegramId();
  const map: Record<string, string> = {};
  for (const p of players) {
    if (p.nick && p.tgId) {
      map[p.nick.trim().toLowerCase()] = p.tgId;
    }
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════
// ТЕЛЕГРАМ-ОТПРАВКА
// ═══════════════════════════════════════════════════════════════════

export async function sendTelegramMessage(telegramID: string | number, message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ ОШИБКА: TELEGRAM_BOT_TOKEN не задан в переменных окружения.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Рейтинг', callback_data: 'rating' },
        { text: '📲 Приложение', url: APP_URL },
        { text: '👤 QR', callback_data: 'qr' },
      ],
      [
        { text: '🎰 Регистрация на ближайшую игру', callback_data: 'reg' },
      ],
    ],
  };

  const payload = {
    chat_id: telegramID,
    text: message,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.ok) {
        console.error(`❌ Telegram API error sendTelegramMessage (to: ${telegramID}, status: ${response.status}, attempt: ${attempt}):`, data.description || data);
        if (response.status === 429 && attempt < 3) {
          const retryAfter = (data.parameters?.retry_after || 2) * 1000;
          console.log(`⏳ [sendTelegramMessage] Rate limited. Retrying after ${retryAfter}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          continue;
        }
      }
      return data.ok === true;
    } catch (e) {
      console.error(`Ошибка sendTelegramMessage (attempt ${attempt}):`, e);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  return false;
}

export async function sendTelegramPhoto(
  telegramID: string | number,
  imageUrl: string,
  caption: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('❌ ОШИБКА: TELEGRAM_BOT_TOKEN не задан в переменных окружения.');
    return false;
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const photo = imageUrl || `${APP_URL}/assets/icon.png`;

  const keyboard = {
    inline_keyboard: [[{ text: '🎰 Записаться', url: APP_URL }]],
  };

  const payload = {
    chat_id: telegramID,
    photo: photo,
    caption: caption,
    parse_mode: 'HTML',
    reply_markup: keyboard,
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.ok) {
        console.error(`❌ Telegram API error sendTelegramPhoto (to: ${telegramID}, status: ${response.status}, attempt: ${attempt}):`, data.description || data);
        if (response.status === 429 && attempt < 3) {
          const retryAfter = (data.parameters?.retry_after || 2) * 1000;
          console.log(`⏳ [sendTelegramPhoto] Rate limited. Retrying after ${retryAfter}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          continue;
        }
      }
      return data.ok === true;
    } catch (e) {
      console.error(`Ошибка sendTelegramPhoto (attempt ${attempt}):`, e);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 2: ПРИГЛАШЕНИЯ ЗА 2 ЧАСА
// ═══════════════════════════════════════════════════════════════════

export async function sendGameInvitations(options?: { debug?: boolean }): Promise<{
  processed: number;
  sent: number;
  debugDetails?: any[];
}> {
  const datesData = await readSheetRawValues(SHEETS.GAME_DATES);
  const dailyData = await readSheetRawDisplayValues(SHEETS.DAILY_GAMES);
  const playersWithTg = await getPlayersWithTelegramId();
  const nickToTgId = await getNickToTgIdMap();
  const nowMs = Date.now();

  let sentCount = 0;
  let processedCount = 0;
  const debugDetails: any[] = [];

  if (datesData && datesData.length >= 2) {
    const headers = datesData[0] || [];

    let notify12Col = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return (
        norm === 'уведомление за 12ч' ||
        norm === 'уведомление за 12 часов' ||
        norm === 'уведомление 12ч' ||
        norm === 'уведомление 12 часов' ||
        norm === 'уведомлено 12ч' ||
        norm === 'уведомлено 12 часов'
      );
    });
    if (notify12Col === -1 && headers.length > 16) notify12Col = 16; // Col Q fallback

    let notify2Col = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return (
        norm === 'уведомление за 2ч' ||
        norm === 'уведомление за 2 часа' ||
        norm === 'уведомление 2ч' ||
        norm === 'уведомление 2 часа' ||
        norm === 'уведомлено 2ч' ||
        norm === 'уведомлено 2 часа'
      );
    });
    if (notify2Col === -1 && headers.length > 17) notify2Col = 17; // Col R fallback

    let regDeadlineCol = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return norm.includes('окончания регистрации') || norm.includes('конец регистрации');
    });

    let dateColIndex = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return norm === 'дата и время' || norm === 'дата';
    });
    if (dateColIndex === -1) dateColIndex = 0;

    for (let i = 1; i < datesData.length; i++) {
      const rawDateStr = datesData[i][dateColIndex];
      if (!rawDateStr) continue;

      const startMs = getGameStartMs(rawDateStr);
      if (!startMs) continue;

      const hoursUntilGame = (startMs - nowMs) / (1000 * 60 * 60);

      // Collect registered players for this date from DAILY_GAMES where Вышел? != true
      const registeredNicks = new Set<string>();
      if (dailyData && dailyData.length >= 2) {
        const dailyHeaders = dailyData[0] || [];
        let dDateCol = dailyHeaders.findIndex((h: any) => String(h || '').trim().toLowerCase().includes('дата'));
        if (dDateCol === -1) dDateCol = 0;

        let dNickCol = dailyHeaders.findIndex((h: any) => String(h || '').trim().toLowerCase() === 'ник');
        if (dNickCol === -1) dNickCol = 1;

        let dExitCol = dailyHeaders.findIndex((h: any) => String(h || '').trim().toLowerCase().includes('вышел'));
        if (dExitCol === -1) dExitCol = 13;

        for (let r = 1; r < dailyData.length; r++) {
          const rowDate = dailyData[r][dDateCol];
          const nick = String(dailyData[r][dNickCol] || '').trim().toLowerCase();
          const exitVal = dailyData[r][dExitCol];
          const isPlayerExited = exitVal === 'TRUE' || exitVal === 'Да' || exitVal === '✓';

          if (rowDate && nick && !isPlayerExited) {
            const rStartMs = getGameStartMs(rowDate);
            if (rStartMs && Math.abs(rStartMs - startMs) < 60000) {
              registeredNicks.add(nick);
            }
          }
        }
      }

      // Format game start time directly in Europe/Moscow timezone using formatDateInTz
      const startDateObj = parseFullDateTime(rawDateStr);
      const timeStr = startDateObj && startDateObj.getTime() > 0
        ? formatDateInTz(startDateObj, 'HH:mm')
        : formatDateInTz(new Date(startMs), 'HH:mm');

      // 12 Hours Window: 11.5 - 12.5 hours before game
      const sent12Flag = notify12Col !== -1 ? String(datesData[i][notify12Col] || '').trim() : '';
      if (hoursUntilGame >= 11.5 && hoursUntilGame <= 12.5 && sent12Flag !== '✓') {
        processedCount++;
        let rowSent = 0;

        // Parse registration deadline time for unregistered players
        let regCloseTimeStr = '';
        if (regDeadlineCol !== -1 && datesData[i][regDeadlineCol]) {
          const regD = parseFullDateTime(datesData[i][regDeadlineCol]);
          if (regD && regD.getTime() > 0) {
            regCloseTimeStr = formatDateInTz(regD, 'HH:mm');
          }
        }

        for (const p of playersWithTg) {
          const isReg = registeredNicks.has(p.nick.toLowerCase());
          const msg = isReg
            ? buildGameReminder12Registered(timeStr)
            : buildGameReminder12NotRegistered(timeStr, regCloseTimeStr);

          const ok = await sendTelegramMessage(p.tgId, msg);
          if (ok) rowSent++;
        }

        // Web Push Parallel Broadcast
        await broadcastWebPush({
          title: '⏰ Напоминание о игре!',
          body: `Сегодня в ${timeStr} состоится турнир в клубе "БАЗА"!`,
          url: '/tournaments',
        });

        if (rowSent > 0 && notify12Col !== -1) {
          await updateCell(SHEETS.GAME_DATES, i + 1, notify12Col + 1, '✓');
        }
        sentCount += rowSent;

        if (options?.debug) {
          debugDetails.push({
            window: '12h',
            date: rawDateStr,
            hoursUntilGame,
            registeredCount: registeredNicks.size,
            sentCount: rowSent,
          });
        }
      }

      // 2 Hours Window: 1.5 - 2.5 hours before game
      const sent2Flag = notify2Col !== -1 ? String(datesData[i][notify2Col] || '').trim() : '';
      if (hoursUntilGame >= 1.5 && hoursUntilGame <= 2.5 && sent2Flag !== '✓') {
        processedCount++;
        let rowSent = 0;

        for (const p of playersWithTg) {
          const isReg = registeredNicks.has(p.nick.toLowerCase());
          const msg = isReg
            ? buildGameReminder2Registered(timeStr)
            : buildGameReminder2NotRegistered(timeStr);

          const ok = await sendTelegramMessage(p.tgId, msg);
          if (ok) rowSent++;
        }

        // Web Push Parallel Broadcast
        await broadcastWebPush({
          title: '🎰 Игра через 2 часа!',
          body: `Начало в ${timeStr}. Ждем вас в клубе "БАЗА"!`,
          url: '/tournaments',
        });

        if (rowSent > 0 && notify2Col !== -1) {
          await updateCell(SHEETS.GAME_DATES, i + 1, notify2Col + 1, '✓');
        }
        sentCount += rowSent;

        if (options?.debug) {
          debugDetails.push({
            window: '2h',
            date: rawDateStr,
            hoursUntilGame,
            registeredCount: registeredNicks.size,
            sentCount: rowSent,
          });
        }
      }
    }
  }

  return { processed: processedCount, sent: sentCount, debugDetails: options?.debug ? debugDetails : undefined };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 3: РЕЗУЛЬТАТЫ И НАГРАДЫ (ЧЕМПИОН + РОДШИЛЬД + БАУНТИ)
// ═══════════════════════════════════════════════════════════════════

export async function recalculatePlacesForDate(
  targetDate: string,
  dailyDataInput?: string[][]
): Promise<void> {
  const data = dailyDataInput || (await readSheetRawDisplayValues(SHEETS.DAILY_GAMES));
  if (!data || data.length < 2) return;

  const targetDateStr = normalizeDateString(targetDate);
  let maxParticipants = 0;
  const exitedRows: Array<{ row: number; time: number; place: string }> = [];

  for (let i = 1; i < data.length; i++) {
    const rowDateStr = normalizeDateString(data[i][0]);

    if (rowDateStr === targetDateStr) {
      const pCount = parseInt(data[i][3], 10) || 0;
      if (pCount > maxParticipants) maxParticipants = pCount;

      const isExited = data[i][13];
      const exitTimeStr = data[i][22];
      const currentPlace = String(data[i][2] || '').trim();

      if (isExited === 'TRUE' || isExited === '✓' || isExited === 'Да') {
        const timestamp = exitTimeStr ? parseFullDateTime(exitTimeStr).getTime() : 0;
        exitedRows.push({
          row: i + 1,
          time: timestamp,
          place: currentPlace,
        });
      } else {
        if (currentPlace !== '') {
          await clearCell(SHEETS.DAILY_GAMES, i + 1, COLS.DAILY_GAMES.PLACE);
        }
      }
    }
  }

  if (maxParticipants === 0 || exitedRows.length === 0) return;

  exitedRows.sort((a, b) => a.time - b.time);

  let placeToAssign = maxParticipants;
  for (let j = 0; j < exitedRows.length; j++) {
    const player = exitedRows[j];
    if (player.time === 0) continue;

    if (player.place !== String(placeToAssign)) {
      await updateCell(SHEETS.DAILY_GAMES, player.row, COLS.DAILY_GAMES.PLACE, placeToAssign);
    }
    placeToAssign--;
  }
}

export async function sendTournamentResults(
  targetDateTime: string,
  dailyDataInput?: string[][]
): Promise<boolean> {
  const dailyData = dailyDataInput || (await readSheetRawDisplayValues(SHEETS.DAILY_GAMES));
  if (!dailyData || dailyData.length < 2) return false;

  const nickToTgId = await getNickToTgIdMap();
  const rewardsData = await readSheetRawDisplayValues(SHEETS.REWARDS);
  const bountyData = await readSheetRawDisplayValues(SHEETS.BOUNTY);

  const now = new Date();
  const timestamp = formatDateInTz(now, 'dd.MM.yyyy HH:mm');

  const targetDateObj = parseFullDateTime(targetDateTime);
  const displayDate = normalizeDateString(targetDateTime);

  const allRewards = rewardsData.length > 1 ? rewardsData.slice(1) : [];
  const allBounties = bountyData.length > 1 ? bountyData.slice(1) : [];

  let foundCount = 0;

  for (let i = 1; i < dailyData.length; i++) {
    const rowDateRaw = dailyData[i][0];
    if (!rowDateRaw || normalizeDateString(rowDateRaw) !== displayDate) continue;

    foundCount++;
    const rowIndex = i + 1;
    const nick = dailyData[i][1];
    const place = String(dailyData[i][2] || '').trim();
    const finalPoints = dailyData[i][5];
    let telegramID = dailyData[i][8];
    const chipsBought = parseFloat(dailyData[i][16]) || 0;
    const rothschildStatus = dailyData[i][21];

    if (!telegramID && nick && nickToTgId[nick.trim().toLowerCase()]) {
      telegramID = nickToTgId[nick.trim().toLowerCase()];
    }

    const currentAwards: string[] = [];

    if (nick) {
      if (place === '1') {
        await appendRowValues(SHEETS.REWARDS, [nick, 'Чемпион дня', 1, timestamp]);
        currentAwards.push('Чемпион дня');
      }

      if (chipsBought > 0 && rothschildStatus !== '✓') {
        await appendRowValues(SHEETS.REWARDS, [nick, 'Кубок "Родшильда"', 1, timestamp]);
        currentAwards.push('Кубок "Родшильда"');
        await updateCell(SHEETS.DAILY_GAMES, rowIndex, COLS.DAILY_GAMES.ROTHSCHILD, '✓');
        console.log(`💎 Родшильд начислен и отмечен для: ${nick}`);
      } else if (chipsBought > 0 && rothschildStatus === '✓') {
        currentAwards.push('Кубок "Родшильда"');
      }
    }

    let extraInfo = '';

    const playerRewardsFromSheet = allRewards.filter((r) => {
      const rewardTime = parseFullDateTime(r[3]);
      return (
        r[0] === nick &&
        rewardTime >= targetDateObj &&
        r[1] !== 'Чемпион дня' &&
        r[1] !== 'Кубок "Родшильда"'
      );
    });

    playerRewardsFromSheet.forEach((r) => currentAwards.push(r[1]));

    if (currentAwards.length > 0) {
      extraInfo += `\n🎁 <b>Награды:</b> ${currentAwards.join(', ')}`;
    }

    const playerBounties = allBounties.filter((b) => {
      const bountyTime = parseFullDateTime(b[0]);
      return b[1] === nick && bountyTime >= targetDateObj;
    });

    if (playerBounties.length > 0) {
      playerBounties.forEach((b) => {
        extraInfo += `\n🎯 <b>Баунти:</b> ${b[2]} (+${b[4]} баллов)`;
      });
    }

    if (telegramID && telegramID.toString().length > 5) {
      const message =
        `🎰 <b>РЕЗУЛЬТАТ ИГРЫ</b>\n\n` +
        `📅 <b>Дата:</b> ${displayDate}\n` +
        `🏆 <b>Место:</b> ${place}\n` +
        `💯 <b>Баллы:</b> +${finalPoints}` +
        `${extraInfo}\n\n` +
        `${APP_URL}`;

      await sendTelegramMessage(telegramID, message);
    }
    await updateCell(SHEETS.DAILY_GAMES, rowIndex, COLS.DAILY_GAMES.RESULT_SENT, '✓');
  }

  return foundCount > 0;
}

export async function checkAndCompleteTournaments(): Promise<{ processed: number; sent: number }> {
  const datesData = await readSheetRawDisplayValues(SHEETS.GAME_DATES);
  if (!datesData || datesData.length < 2) return { processed: 0, sent: 0 };

  let processedCount = 0;
  let sentCount = 0;

  for (let i = 1; i < datesData.length; i++) {
    const dateTime = datesData[i][0];
    const isCompleted = datesData[i][2];
    const alreadyNotified = datesData[i][7];

    if (!dateTime) continue;

    const isDone = String(isCompleted).toUpperCase() === 'TRUE' || isCompleted === 'Да';

    if (!isDone) {
      await recalculatePlacesForDate(dateTime);
    }

    if (alreadyNotified === '✓') continue;

    if (isDone) {
      const freshDailyData = await readSheetRawDisplayValues(SHEETS.DAILY_GAMES);
      const success = await sendTournamentResults(dateTime, freshDailyData);
      await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.NOTIFIED, '✓');
      if (success) {
        console.log(`✅ Успешно обработано для даты: ${dateTime}`);
        sentCount++;
      } else {
        console.log(`ℹ️ Игра завершена без отправки результатов в Telegram, флаг обновлен: ${dateTime}`);
      }
      processedCount++;
    }
  }

  return { processed: processedCount, sent: sentCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 4: ПОВЫШЕННЫЙ РЕЙТИНГ
// ═══════════════════════════════════════════════════════════════════

export async function notifyAbsentPlayers(): Promise<{ processed: number; sent: number; notified: number }> {
  const datesData = await readSheetRawDisplayValues(SHEETS.GAME_DATES);
  const dailyData = await readSheetRawDisplayValues(SHEETS.DAILY_GAMES);
  const playersData = await readSheetRawDisplayValues(SHEETS.PLAYERS);

  if (!datesData || datesData.length < 2 || !playersData || playersData.length < 2) {
    return { processed: 0, sent: 0, notified: 0 };
  }

  const allPlayers: Record<string, string> = {};
  for (let i = 1; i < playersData.length; i++) {
    const nick = playersData[i][0];
    const tgId = playersData[i][8];
    if (nick && tgId) {
      allPlayers[nick] = tgId;
    }
  }

  let notifiedCount = 0;
  let processedCount = 0;

  for (let i = 1; i < datesData.length; i++) {
    const dateTime = datesData[i][0];
    const status = datesData[i][8];
    const notified = datesData[i][9];

    if (status !== 'Повышенный рейтинг' || notified === '✓') continue;

    processedCount++;

    const playersOnDate = new Set(
      dailyData
        .filter((r) => String(r[0]) === dateTime)
        .map((r) => r[1])
    );

    for (const nick in allPlayers) {
      if (!playersOnDate.has(nick)) {
        const msg = `🎰 <b>ПОВЫШЕННЫЙ РЕЙТИНГ!</b>\n\n📅 <b>Дата:</b> ${dateTime}\n\nСпеши зайти!\n${APP_URL}`;
        const ok = await sendTelegramMessage(allPlayers[nick], msg);
        if (ok) notifiedCount++;
      }
    }

    await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.NOTIFIED_ABSENT, '✓');
  }

  return { processed: processedCount, sent: notifiedCount, notified: notifiedCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 5: ЕДИНОЕ ПОЛЕ УВЕДОМИТЬ = ДА
// ═══════════════════════════════════════════════════════════════════

export interface BroadcastOptions {
  flagColumnHeader?: string;
  sentColumnHeader?: string;
  messageTemplate?: (row: any[], headers: any[]) => string;
  textPrefix?: string;
  debug?: boolean;
}

export async function processFlagBroadcast(
  sheetName: string,
  options: BroadcastOptions = {}
): Promise<{ processed: number; sent: number; sheetNotFound?: boolean; debugInfo?: any[] }> {
  const data = await readSheetRawValues(sheetName);
  if (!data || data.length < 2) {
    console.error(`[processFlagBroadcast] Лист "${sheetName}" не найден или пуст — проверь точное имя листа`);
    return { processed: -1, sent: 0, sheetNotFound: true, debugInfo: [] };
  }

  const headers = data[0] || [];

  let flagColIndex = -1;
  const targetHeader = options.flagColumnHeader
    ? options.flagColumnHeader.trim().toLowerCase()
    : null;

  if (targetHeader) {
    flagColIndex = headers.findIndex(
      (h: any) => String(h || '').trim().toLowerCase() === targetHeader
    );
  }

  if (flagColIndex === -1) {
    flagColIndex = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      if (norm.includes('завершить') || norm.includes('предоплата')) return false;
      return norm === 'уведомление' || norm === 'уведомления' || norm.startsWith('уведомление');
    });
  }

  if (flagColIndex === -1) {
    if (sheetName === SHEETS.NEWS) flagColIndex = COLS.NEWS.FLAG_INDEX;
    else if (sheetName === SHEETS.PROMOTIONS) flagColIndex = COLS.PROMOTIONS.FLAG_INDEX;
    else if (sheetName === SHEETS.SEASONS) flagColIndex = COLS.SEASONS.FLAG_INDEX;
    else flagColIndex = 5;
  }

  const players = await getPlayersWithTelegramId();
  let processedCount = 0;
  let totalSentCount = 0;
  const debugInfo: any[] = [];

  for (let i = 1; i < data.length; i++) {
    const rawVal = String(data[i][flagColIndex] || '').trim().toUpperCase();
    const isNotify =
      rawVal === 'ДА' ||
      rawVal === 'DA' ||
      rawVal === 'YES' ||
      rawVal === 'Y' ||
      rawVal === '1' ||
      rawVal === '2' ||
      rawVal === 'TRUE';

    if (!isNotify) continue;

    processedCount++;

    let messageText = '';
    if (options.messageTemplate) {
      messageText = options.messageTemplate(data[i], headers);
    } else {
      const { title, text } = extractTitleAndText(data[i], headers);
      const prefix = options.textPrefix || '📢 Уведомление!';

      messageText = `<b>${prefix}</b>\n\n`;
      if (title) messageText += `<b>${title}</b>\n`;
      if (text) messageText += `${text}\n\n`;
      messageText += `${APP_URL}`;
    }

    let photoUrl = '';
    const photoColIdx = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return norm === 'фото' || norm === 'картинка' || norm === 'изображение';
    });
    if (photoColIdx !== -1 && data[i][photoColIdx]) {
      photoUrl = String(data[i][photoColIdx]).trim();
    } else {
      if (sheetName === SHEETS.NEWS && data[i][4]) photoUrl = String(data[i][4]).trim();
      else if (sheetName === SHEETS.PROMOTIONS && data[i][5]) photoUrl = String(data[i][5]).trim();
      else if (sheetName === SHEETS.SEASONS && data[i][6]) photoUrl = String(data[i][6]).trim();
    }

    let sentForThisRow = 0;
    const recipientLogs: any[] = [];

    for (const player of players) {
      let ok = false;
      if (photoUrl && photoUrl.startsWith('http')) {
        ok = await sendTelegramPhoto(player.tgId, photoUrl, messageText);
      } else {
        ok = await sendTelegramMessage(player.tgId, messageText);
      }
      if (ok) {
        sentForThisRow++;
        totalSentCount++;
      }
      if (options.debug) {
        recipientLogs.push({
          nick: player.nick,
          tgId: player.tgId,
          success: ok,
        });
      }
    }

    // Dual-broadcast to Web Push subscribers (decoupled from Telegram ID existence)
    let pushSentForThisRow = 0;
    try {
      const pushTitle = options.textPrefix || '📢 Уведомление!';
      const { title: titleStr, text: textStr } = extractTitleAndText(data[i], headers);
      const pushBody = titleStr && textStr ? `${titleStr}: ${textStr}` : titleStr || textStr;
      const pushUrl = sheetName === SHEETS.NEWS ? '/news' : sheetName === SHEETS.PROMOTIONS ? '/home' : '/tournaments';
      const eventName = sheetName === SHEETS.NEWS ? 'news' : sheetName === SHEETS.PROMOTIONS ? 'news' : 'game';

      const pushRes = await broadcastWebPush({
        title: pushTitle,
        body: pushBody,
        url: pushUrl,
        eventName,
      });
      pushSentForThisRow = pushRes.sent;
    } catch (pushErr) {
      console.error('Error sending Web Push during flag broadcast:', pushErr);
    }

    const markedSent = (players.length > 0 && sentForThisRow > 0) || pushSentForThisRow > 0;

    if (players.length === 0 && pushSentForThisRow === 0) {
      console.warn(
        `⚠️ [processFlagBroadcast] Лист "${sheetName}", строка ${i + 1}: получатели с Telegram ID и Web Push подписками не найдены. Флаг НЕ сброшен.`
      );
    } else if (markedSent) {
      const targetColNumber = flagColIndex + 1;
      await updateCell(sheetName, i + 1, targetColNumber, '✓');
      console.log(
        `✅ [processFlagBroadcast] Лист "${sheetName}", строка ${i + 1}: флаг в столбце ${targetColNumber} обновлен на "✓" (отправлено TG: ${sentForThisRow}/${players.length}, Push: ${pushSentForThisRow})`
      );
    } else {
      console.warn(
        `⚠️ [processFlagBroadcast] Лист "${sheetName}", строка ${i + 1}: ни одно сообщение не доставлено (TG: ${sentForThisRow}/${players.length}, Push: ${pushSentForThisRow}). Флаг НЕ сброшен.`
      );
    }

    if (options.debug) {
      debugInfo.push({
        row: i + 1,
        sheet: sheetName,
        sentCount: sentForThisRow,
        totalRecipients: players.length,
        markedSent,
        recipients: recipientLogs,
      });
    }
  }

  return { processed: processedCount, sent: totalSentCount, debugInfo };
}

export async function processGenericBroadcast(
  sheetName: string,
  flagColIndex: number,
  resetColNumber: number,
  textPrefix: string,
  ids: string[]
): Promise<number> {
  const result = await processFlagBroadcast(sheetName, { textPrefix });
  return result.sent;
}

export async function checkGeneralNotifications(options?: { debug?: boolean }): Promise<{ broadcasts: number; processed: number; sent: number; results?: Record<string, any>; debugDetails?: any[] }> {
  let totalProcessed = 0;
  let totalSent = 0;
  const allDebugInfo: any[] = [];
  const results: Record<string, any> = {};

  const newsRes = await processFlagBroadcast(SHEETS.NEWS, {
    textPrefix: '📰 У нас новая новость!',
    messageTemplate: (row, headers) => {
      const { title, text } = extractTitleAndText(row, headers);
      let msg = `<b>📰 У нас новая новость!</b>\n\n`;
      if (title) msg += `<b>${title}</b>\n`;
      if (text) msg += `${text}\n\n`;
      msg += `${APP_URL}/news`;
      return msg;
    },
    debug: options?.debug,
  });
  results[SHEETS.NEWS] = newsRes;
  if (newsRes.processed > 0) totalProcessed += newsRes.processed;
  totalSent += newsRes.sent;
  if (newsRes.debugInfo) allDebugInfo.push(...newsRes.debugInfo);

  const promoRes = await processFlagBroadcast(SHEETS.PROMOTIONS, {
    textPrefix: '🃏 У нас новая акция!',
    messageTemplate: (row, headers) => {
      const { title, text } = extractTitleAndText(row, headers);
      let msg = `<b>🃏 У нас новая акция!</b>\n\n`;
      if (title) msg += `<b>${title}</b>\n`;
      if (text) msg += `${text}\n\n`;
      msg += `${APP_URL}/home`;
      return msg;
    },
    debug: options?.debug,
  });
  results[SHEETS.PROMOTIONS] = promoRes;
  if (promoRes.processed > 0) totalProcessed += promoRes.processed;
  totalSent += promoRes.sent;
  if (promoRes.debugInfo) allDebugInfo.push(...promoRes.debugInfo);

  const seasonRes = await processFlagBroadcast(SHEETS.SEASONS, {
    textPrefix: '🎲 Новый сезонный турнир!',
    messageTemplate: (row, headers) => {
      const { title, text } = extractTitleAndText(row, headers);
      let msg = `<b>🎲 Новый сезонный турнир!</b>\n\n`;
      if (title) msg += `<b>${title}</b>\n`;
      if (text) msg += `${text}\n\n`;
      msg += `${APP_URL}/tournaments`;
      return msg;
    },
    debug: options?.debug,
  });
  results[SHEETS.SEASONS] = seasonRes;
  if (seasonRes.processed > 0) totalProcessed += seasonRes.processed;
  totalSent += seasonRes.sent;
  if (seasonRes.debugInfo) allDebugInfo.push(...seasonRes.debugInfo);

  return {
    broadcasts: totalSent,
    processed: totalProcessed,
    sent: totalSent,
    results,
    debugDetails: options?.debug ? allDebugInfo : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 6: УВЕДОМЛЕНИЯ О НОВЫХ ИГРАХ (checkGameNotifications)
// ═══════════════════════════════════════════════════════════════════

export async function checkGameNotifications(options?: { debug?: boolean }): Promise<{ processed: number; sent: number; debugDetails?: any[] }> {
  const datesData = await readSheetRawValues(SHEETS.GAME_DATES);
  const datesDisplayData = await readSheetRawDisplayValues(SHEETS.GAME_DATES);
  if (!datesData || datesData.length < 2) return { processed: 0, sent: 0, debugDetails: [] };

  const headers = datesData[0] || [];

  let flagColIndex = headers.findIndex((h: any) => {
    const norm = String(h || '').trim().toLowerCase();
    if (norm.includes('завершить') || norm.includes('предоплата')) return false;
    return norm === 'уведомления' || norm === 'уведомление' || norm.startsWith('уведомление');
  });
  if (flagColIndex === -1) flagColIndex = 7;

  let dateColIndex = headers.findIndex((h: any) => {
    const norm = String(h || '').trim().toLowerCase();
    return norm === 'дата и время' || norm === 'дата';
  });
  if (dateColIndex === -1) dateColIndex = 0;

  const players = await getPlayersWithTelegramId();
  const now = new Date();
  const nowMoscowStr = formatDateInTz(now, 'dd.MM.yyyy HH:mm');

  let processedCount = 0;
  let totalSent = 0;
  const debugDetails: any[] = [];

  for (let i = 1; i < datesData.length; i++) {
    const rawFlag = String(datesData[i][flagColIndex] || '').trim().toUpperCase();
    const rawDateStr = datesData[i][dateColIndex];
    const gameDateTime = rawDateStr ? parseFullDateTime(rawDateStr) : null;

    // Treat serial/parsed date as Europe/Moscow wall-clock time by subtracting 3-hour MSK offset for UTC comparison
    const gameMskTimestamp = gameDateTime && !isNaN(gameDateTime.getTime()) && gameDateTime.getTime() > 0
      ? gameDateTime.getTime() - 3 * 3600 * 1000
      : null;
    const hoursUntilGame = gameMskTimestamp !== null
      ? (gameMskTimestamp - now.getTime()) / (1000 * 60 * 60)
      : null;

    const isNotify =
      rawFlag === 'ДА' ||
      rawFlag === 'DA' ||
      rawFlag === 'YES' ||
      rawFlag === 'Y' ||
      rawFlag === '1' ||
      rawFlag === '2' ||
      rawFlag === 'TRUE';

    // Take exact formatted display value from Google Sheets
    const displayDateTimeStr = (datesDisplayData && datesDisplayData[i] && datesDisplayData[i][dateColIndex])
      ? String(datesDisplayData[i][dateColIndex]).trim()
      : String(rawDateStr || '').trim();

    console.log(
      `[checkGameNotifications] Row ${i + 1}: rawDate="${rawDateStr}", displayDate="${displayDateTimeStr}", parsed="${gameDateTime ? formatDateInTz(gameDateTime, 'dd.MM.yyyy HH:mm') : 'invalid'}", now="${nowMoscowStr}", deltaHours=${hoursUntilGame !== null ? hoursUntilGame.toFixed(2) : 'N/A'}, flag="${rawFlag}" -> shouldNotify=${isNotify}`
    );

    if (!isNotify) continue;

    processedCount++;
    if (!rawDateStr || !gameDateTime || isNaN(gameDateTime.getTime()) || gameDateTime.getTime() === 0) continue;

    let sentForThisGame = 0;
    const recipientLogs: any[] = [];

    const imageUrl = String(datesData[i][14] || '').trim(); // Col O

    let descKIdx = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return norm === 'описание' || norm === 'описание игры';
    });
    if (descKIdx === -1) descKIdx = 10;

    let descPIdx = headers.findIndex((h: any) => {
      const norm = String(h || '').trim().toLowerCase();
      return norm.includes('что будет') || norm === 'что будет';
    });
    if (descPIdx === -1) descPIdx = 15;

    const rawDescK = cleanNotificationValue(datesData[i][descKIdx]);
    const rawDescP = cleanNotificationValue(datesData[i][descPIdx]);

    const descK = rawDescK ? escapeHtml(rawDescK) : '';
    const descP = rawDescP ? escapeHtml(rawDescP) : '';

    let gameMsg = `🎰 <b>Открыта запись на игру!</b>\n\n⏰ <b>Дата и время:</b> ${displayDateTimeStr}`;
    if (descK) {
      gameMsg += `\n\n📋 <b>${descK}</b>`;
    }
    if (descP) {
      gameMsg += `\n\n✅ <b>Что будет:</b>\n${descP}`;
    }
    gameMsg += `\n\n<a href="${APP_URL}/tournaments">Записаться на игру</a>`;

    for (const player of players) {
      let ok = false;
      if (imageUrl && imageUrl.startsWith('http')) {
        ok = await sendTelegramPhoto(player.tgId, imageUrl, gameMsg);
      } else {
        ok = await sendTelegramMessage(player.tgId, gameMsg);
      }

      if (ok) {
        sentForThisGame++;
        totalSent++;
      }
      if (options?.debug) {
        recipientLogs.push({ nick: player.nick, tgId: player.tgId, type: 'invitation', success: ok });
      }
    }

    // Dual-broadcast to Web Push subscribers for new game
    try {
      await broadcastWebPush({
        title: '🎰 Открыта запись на игру!',
        body: `Дата и время: ${displayDateTimeStr}${descK ? ` — ${descK}` : ''}`,
        url: '/tournaments',
        eventName: 'game',
      });
    } catch (pushErr) {
      console.error('Error sending Web Push in checkGameNotifications:', pushErr);
    }

    if (players.length === 0) {
      console.warn(`⚠️ [checkGameNotifications] Получатели не найдены (0 игроков с Telegram ID). Флаг строки ${i + 1} НЕ сброшен.`);
    } else if (sentForThisGame > 0) {
      await updateCell(SHEETS.GAME_DATES, i + 1, flagColIndex + 1, '✓');
      console.log(`✅ [checkGameNotifications] "Даты ежедневных игр" строка ${i + 1}: флаг обновлен на "✓" (отправлено: ${sentForThisGame}/${players.length})`);
    } else {
      console.warn(`⚠️ [checkGameNotifications] Ни одно сообщение не отправлено для строки ${i + 1}. Флаг НЕ сброшен.`);
    }

    if (options?.debug) {
      debugDetails.push({
        row: i + 1,
        date: displayDateTimeStr,
        hoursUntilGame,
        sentCount: sentForThisGame,
        totalRecipients: players.length,
        recipients: recipientLogs,
      });
    }
  }

  return { processed: processedCount, sent: totalSent, debugDetails: options?.debug ? debugDetails : undefined };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 7: АНОНС ИГРЫ ЗА ДЕНЬ (В 16:00)
// ═══════════════════════════════════════════════════════════════════

export async function checkNewGameAnnouncements(): Promise<{ processed: number; sent: number; announced: number }> {
  const datesData = await readSheetRawValues(SHEETS.GAME_DATES);
  const playersData = await readSheetRawValues(SHEETS.PLAYERS);

  if (!datesData || datesData.length < 2 || !playersData || playersData.length < 2) {
    return { processed: 0, sent: 0, announced: 0 };
  }

  const ids = playersData
    .slice(1)
    .map((r) => String(r[8] || '').trim())
    .filter((id) => id.length > 0);

  if (ids.length === 0) return { processed: 0, sent: 0, announced: 0 };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateInTz(tomorrow, 'dd.MM.yyyy');

  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];

  let announcedCount = 0;
  let totalSentCount = 0;
  let processedCount = 0;

  for (let i = 1; i < datesData.length; i++) {
    const rawDate = datesData[i][0];
    const alreadyAnnounced = String(datesData[i][13] || '').trim();

    if (!rawDate || alreadyAnnounced === '✓') continue;

    let rowDateStr = '';
    if (rawDate instanceof Date) {
      rowDateStr = formatDateInTz(rawDate, 'dd.MM.yyyy');
    } else {
      rowDateStr = String(rawDate).substring(0, 10);
    }

    if (rowDateStr === tomorrowStr) {
      processedCount++;
      const headers = datesData[0] || [];
      let descKIdx = headers.findIndex((h: any) => {
        const norm = String(h || '').trim().toLowerCase();
        return norm === 'описание' || norm === 'описание игры';
      });
      if (descKIdx === -1) descKIdx = 10;

      let descPIdx = headers.findIndex((h: any) => {
        const norm = String(h || '').trim().toLowerCase();
        return norm.includes('что будет') || norm === 'что будет';
      });
      if (descPIdx === -1) descPIdx = 15;

      const rawDescK = cleanNotificationValue(datesData[i][descKIdx]);
      const rawDescP = cleanNotificationValue(datesData[i][descPIdx]) || 'Захватывающая игра!';

      const descK = rawDescK ? escapeHtml(rawDescK) : '';
      const descP = escapeHtml(rawDescP);
      const imageUrl = String(datesData[i][14] || '').trim();

      let timeStr = '19:00';
      let day = tomorrow.getDate();
      let month = months[tomorrow.getMonth()];

      if (rawDate instanceof Date) {
        timeStr = formatDateInTz(rawDate, 'HH:mm');
        day = rawDate.getDate();
        month = months[rawDate.getMonth()];
      } else {
        const timeMatch = String(rawDate).match(/(\d{2}:\d{2})/);
        if (timeMatch) timeStr = timeMatch[1];
      }

      const kBlock = descK ? `📋 <b>${descK}</b>\n\n` : '';

      const text =
        `Дорогие участники Клуба! \n\n` +
        `Открыта запись на турнир, который состоится завтра, <b>${day} ${month}</b>, в <b>${timeStr}</b>!  \n\n` +
        `🗺 Турнир пройдет \n` +
        `       в Саратове по адресу Чапаева 73\n\n` +
        `${kBlock}` +
        `✅ <b>Что будет:</b>\n${descP}\n\n` +
        `⛔️⛔️⛔️\n` +
        `Количество мест ограничено! \n\n` +
        `Записывайтесь через наше приложение!\n${APP_URL} ❣️❣️❣️\n\n` +
        `За час до турнира состоится полностью бесплатное обучение для новичков! 🎓 \n\n` +
        `В ожидании своих гостей,\nКоманда клуба База!`;

      let successCount = 0;

      for (const id of ids) {
        if (imageUrl && imageUrl.startsWith('http')) {
          const ok = await sendTelegramPhoto(id, imageUrl, text);
          if (ok) {
            successCount++;
            totalSentCount++;
          }
        } else {
          const ok = await sendTelegramMessage(id, text);
          if (ok) {
            successCount++;
            totalSentCount++;
          }
        }
      }

      // Dual-broadcast Web Push for game announcement
      try {
        await broadcastWebPush({
          title: '🎰 АНОНС ИГРЫ!',
          body: `Завтра в ${timeStr} состоится турнир в клубе "БАЗА"!`,
          url: '/tournaments',
          eventName: 'game',
        });
      } catch (pushErr) {
        console.error('Error sending Web Push in checkNewGameAnnouncements:', pushErr);
      }

      if (successCount > 0) {
        await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.ANNOUNCED, '✓');
        announcedCount++;
      }
    }
  }

  return { processed: processedCount, sent: totalSentCount, announced: announcedCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 8: НАГРАДА "КИЛЛЕР" (ЛИСТ БАУНТИ)
// ═══════════════════════════════════════════════════════════════════

export async function checkBountyAwards(): Promise<{ processed: number; sent: number; awarded: number }> {
  const bountyData = await readSheetRawValues(SHEETS.BOUNTY);
  if (!bountyData || bountyData.length < 2) return { processed: 0, sent: 0, awarded: 0 };

  const now = new Date();
  const timestamp = formatDateInTz(now, 'dd.MM.yyyy HH:mm');
  let awardedCount = 0;
  let processedCount = 0;

  for (let i = 1; i < bountyData.length; i++) {
    const nick = bountyData[i][1];
    const status = bountyData[i][6];

    if (nick && !status) {
      processedCount++;
      await appendRowValues(SHEETS.REWARDS, [nick, 'Киллер', 1, timestamp]);
      await updateCell(SHEETS.BOUNTY, i + 1, COLS.BOUNTY.STATUS, '✓');
      awardedCount++;
    }
  }

  return { processed: processedCount, sent: awardedCount, awarded: awardedCount };
}
