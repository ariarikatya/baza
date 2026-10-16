import {
  readSheetRawDisplayValues,
  readSheetRawValues,
  updateCell,
  clearCell,
  appendRowValues,
} from '@/lib/googleSheets';

// ═══════════════════════════════════════════════════════════════════
// ═══ НАСТРОЙКИ ═══
// ═══════════════════════════════════════════════════════════════════
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const APP_URL = 'https://baza64.glide.page';

export const SHEETS = {
  DAILY_GAMES: '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ',
  GAME_DATES: 'Даты ежедневных игр',
  REWARDS: 'Начисление наград',
  BOUNTY: '💰 БАУНТИ',
  PLAYERS: 'Игроки',
  NEWS: 'Новости',
  PROMOTIONS: 'Акции',
  SEASONS: 'Сезонные турниры',
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
    FLAG_INDEX: 5,      // 0-based index (Col F)
    RESET_COL: 7,       // 1-based col (Col G)
  },
  PROMOTIONS: {
    FLAG_INDEX: 4,      // 0-based index (Col E)
    RESET_COL: 6,       // 1-based col (Col F)
  },
  SEASONS: {
    FLAG_INDEX: 7,      // 0-based index (Col H)
    RESET_COL: 9,       // 1-based col (Col I)
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
  if (str instanceof Date) return str;
  try {
    const s = String(str).trim();
    const parts = s.match(/(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2}):?(\d{2})?/);
    if (parts) {
      return new Date(
        parseInt(parts[3], 10),
        parseInt(parts[2], 10) - 1,
        parseInt(parts[1], 10),
        parseInt(parts[4], 10),
        parseInt(parts[5], 10),
        parseInt(parts[6] || '0', 10)
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
  return match ? match[1] : s;
}

export function parseGameDateTime(dateStr: any): Date | null {
  try {
    const parts = String(dateStr).trim().split(' ');
    const d = parts[0].split('.');
    const t = parts[1].split(':');
    return new Date(
      parseInt(d[2], 10),
      parseInt(d[1], 10) - 1,
      parseInt(d[0], 10),
      parseInt(t[0], 10),
      parseInt(t[1], 10),
      0
    );
  } catch (e) {
    return null;
  }
}

export function formatTime(dateObj: Date): string {
  return (
    String(dateObj.getHours()).padStart(2, '0') +
    ':' +
    String(dateObj.getMinutes()).padStart(2, '0')
  );
}

function formatDateInTz(date: Date, formatStr: string = 'dd.MM.yyyy HH:mm:ss'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
  const ss = map.second || String(date.getSeconds()).padStart(2, '0');

  if (formatStr === 'dd.MM.yyyy') return `${dd}.${MM}.${yyyy}`;
  if (formatStr === 'HH:mm') return `${HH}:${mm}`;
  return `${dd}.${MM}.${yyyy} ${HH}:${mm}:${ss}`;
}

// ═══════════════════════════════════════════════════════════════════
// ТЕЛЕГРАМ-ОТПРАВКА
// ═══════════════════════════════════════════════════════════════════

export async function sendTelegramMessage(telegramID: string | number, message: string): Promise<boolean> {
  const token = TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан.');
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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.ok === true;
  } catch (e) {
    console.error('Ошибка sendTelegramMessage:', e);
    return false;
  }
}

export async function sendTelegramPhoto(
  telegramID: string | number,
  imageUrl: string,
  caption: string
): Promise<boolean> {
  const token = TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN не задан.');
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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.ok === true;
  } catch (e) {
    console.error('Ошибка sendTelegramPhoto:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 2: ПРИГЛАШЕНИЯ ЗА 2 ЧАСА
// ═══════════════════════════════════════════════════════════════════

export async function sendGameInvitations(): Promise<{ processed: number; sent: number }> {
  const dailyData = await readSheetRawDisplayValues(SHEETS.DAILY_GAMES);
  if (!dailyData || dailyData.length < 2) return { processed: 0, sent: 0 };

  const now = new Date();
  let sentCount = 0;
  let processedCount = 0;

  for (let i = 1; i < dailyData.length; i++) {
    const playerDate = dailyData[i][0];
    const telegramID = dailyData[i][8];
    const alreadySent = dailyData[i][11];

    if (alreadySent === '✓' || !telegramID) continue;

    const gameDateTime = parseGameDateTime(playerDate);
    if (!gameDateTime) continue;

    const hoursUntilGame = (gameDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (
      hoursUntilGame >= TIME_THRESHOLDS.INVITATION_MIN_HOURS &&
      hoursUntilGame <= TIME_THRESHOLDS.INVITATION_MAX_HOURS
    ) {
      processedCount++;
      const message = `🎰 <b>ПРИГЛАШЕНИЕ!</b>\n\nИгра через 2 часа!\n⏰ <b>Время:</b> ${formatTime(gameDateTime)}\n\n${APP_URL}`;
      const ok = await sendTelegramMessage(telegramID, message);
      if (ok) {
        await updateCell(SHEETS.DAILY_GAMES, i + 1, COLS.DAILY_GAMES.INVITATION_SENT, '✓');
        sentCount++;
      }
    }
  }

  return { processed: processedCount, sent: sentCount };
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

  const rewardsData = await readSheetRawDisplayValues(SHEETS.REWARDS);
  const bountyData = await readSheetRawDisplayValues(SHEETS.BOUNTY);

  const now = new Date();
  const timestamp = formatDateInTz(now, 'dd.MM.yyyy HH:mm:ss');

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
    const telegramID = dailyData[i][8];
    const chipsBought = parseFloat(dailyData[i][16]) || 0;
    const rothschildStatus = dailyData[i][21];

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

export async function checkAndCompleteTournaments(): Promise<{ processed: number }> {
  const datesData = await readSheetRawDisplayValues(SHEETS.GAME_DATES);
  if (!datesData || datesData.length < 2) return { processed: 0 };

  let processedCount = 0;

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
      if (success) {
        await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.NOTIFIED, '✓');
        console.log(`✅ Успешно обработано для даты: ${dateTime}`);
        processedCount++;
      }
    }
  }

  return { processed: processedCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 4: ПОВЫШЕННЫЙ РЕЙТИНГ
// ═══════════════════════════════════════════════════════════════════

export async function notifyAbsentPlayers(): Promise<{ notified: number }> {
  const datesData = await readSheetRawDisplayValues(SHEETS.GAME_DATES);
  const dailyData = await readSheetRawDisplayValues(SHEETS.DAILY_GAMES);
  const playersData = await readSheetRawDisplayValues(SHEETS.PLAYERS);

  if (!datesData || datesData.length < 2 || !playersData || playersData.length < 2) {
    return { notified: 0 };
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

  for (let i = 1; i < datesData.length; i++) {
    const dateTime = datesData[i][0];
    const status = datesData[i][8];
    const notified = datesData[i][9];

    if (status !== 'Повышенный рейтинг' || notified === '✓') continue;

    const playersOnDate = new Set(
      dailyData
        .filter((r) => String(r[0]) === dateTime)
        .map((r) => r[1])
    );

    for (const nick in allPlayers) {
      if (!playersOnDate.has(nick)) {
        const msg = `🎰 <b>ПОВЫШЕННЫЙ РЕЙТИНГ!</b>\n\n📅 <b>Дата:</b> ${dateTime}\n\nСпеши зайти!\n${APP_URL}`;
        await sendTelegramMessage(allPlayers[nick], msg);
        notifiedCount++;
      }
    }

    await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.NOTIFIED_ABSENT, '✓');
  }

  return { notified: notifiedCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 5: НОВОСТИ / АКЦИИ / СЕЗОНЫ
// ═══════════════════════════════════════════════════════════════════

export async function processGenericBroadcast(
  sheetName: string,
  flagColIndex: number,
  resetColNumber: number,
  textPrefix: string,
  ids: string[]
): Promise<number> {
  const data = await readSheetRawValues(sheetName);
  if (!data || data.length < 2) return 0;

  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const flagValue = String(data[i][flagColIndex] || '').trim();
    if (flagValue === '1' || flagValue === '2') {
      const msg = `<b>${textPrefix}</b>\n\n${APP_URL}`;
      for (const id of ids) {
        await sendTelegramMessage(id, msg);
      }
      await updateCell(sheetName, i + 1, resetColNumber, 0);
      count++;
    }
  }

  return count;
}

export async function checkGeneralNotifications(): Promise<{ broadcasts: number }> {
  const playersData = await readSheetRawValues(SHEETS.PLAYERS);
  if (!playersData || playersData.length < 2) return { broadcasts: 0 };

  const ids = playersData
    .slice(1)
    .map((r) => String(r[8] || '').trim())
    .filter((id) => id.length > 0);

  if (ids.length === 0) return { broadcasts: 0 };

  let total = 0;
  total += await processGenericBroadcast(
    SHEETS.NEWS,
    COLS.NEWS.FLAG_INDEX,
    COLS.NEWS.RESET_COL,
    '📰 У нас новости!',
    ids
  );
  total += await processGenericBroadcast(
    SHEETS.PROMOTIONS,
    COLS.PROMOTIONS.FLAG_INDEX,
    COLS.PROMOTIONS.RESET_COL,
    '🃏 У нас новая акция!',
    ids
  );
  total += await processGenericBroadcast(
    SHEETS.SEASONS,
    COLS.SEASONS.FLAG_INDEX,
    COLS.SEASONS.RESET_COL,
    '🎲 Новый сезонный турнир!',
    ids
  );

  return { broadcasts: total };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 7: АНОНС ИГРЫ ЗА ДЕНЬ (В 16:00)
// ═══════════════════════════════════════════════════════════════════

export async function checkNewGameAnnouncements(): Promise<{ announced: number }> {
  const datesData = await readSheetRawValues(SHEETS.GAME_DATES);
  const playersData = await readSheetRawValues(SHEETS.PLAYERS);

  if (!datesData || datesData.length < 2 || !playersData || playersData.length < 2) {
    return { announced: 0 };
  }

  const ids = playersData
    .slice(1)
    .map((r) => String(r[8] || '').trim())
    .filter((id) => id.length > 0);

  if (ids.length === 0) return { announced: 0 };

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
      const descK = datesData[i][10] || '';
      const descP = datesData[i][15] || 'Захватывающая игра!';
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

      const text =
        `Дорогие участники Клуба! \n\n` +
        `Открыта запись на турнир, который состоится завтра, <b>${day} ${month}</b>, в <b>${timeStr}</b>!  \n\n` +
        `🗺 Турнир пройдет \n` +
        `       в Саратове по адресу Чапаева 73\n\n` +
        `${descK}\n\n` +
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
          if (ok) successCount++;
        } else {
          const ok = await sendTelegramMessage(id, text);
          if (ok) successCount++;
        }
      }

      if (successCount > 0) {
        await updateCell(SHEETS.GAME_DATES, i + 1, COLS.GAME_DATES.ANNOUNCED, '✓');
        announcedCount++;
      }
    }
  }

  return { announced: announcedCount };
}

// ═══════════════════════════════════════════════════════════════════
// ЧАСТЬ 8: НАГРАДА "КИЛЛЕР" (ЛИСТ БАУНТИ)
// ═══════════════════════════════════════════════════════════════════

export async function checkBountyAwards(): Promise<{ awarded: number }> {
  const bountyData = await readSheetRawValues(SHEETS.BOUNTY);
  if (!bountyData || bountyData.length < 2) return { awarded: 0 };

  const now = new Date();
  const timestamp = formatDateInTz(now, 'dd.MM.yyyy HH:mm:ss');
  let awardedCount = 0;

  for (let i = 1; i < bountyData.length; i++) {
    const nick = bountyData[i][1];
    const status = bountyData[i][6];

    if (nick && !status) {
      await appendRowValues(SHEETS.REWARDS, [nick, 'Киллер', 1, timestamp]);
      await updateCell(SHEETS.BOUNTY, i + 1, COLS.BOUNTY.STATUS, '✓');
      awardedCount++;
    }
  }

  return { awarded: awardedCount };
}
