import { readSheet, updateRow, writeRow } from '@/lib/googleSheets';

export interface SheetsService {
  readSheet: (sheetName: string) => Promise<any[]>;
  updateRow: (sheetName: string, searchKey: string, searchValue: string, updatedFields: Record<string, any>) => Promise<boolean>;
  writeRow: (sheetName: string, rowData: Record<string, any>) => Promise<boolean>;
}

export function getMainMenu() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Рейтинг', callback_data: 'rating' },
        { text: '📲 Приложение', callback_data: 'app' },
      ],
      [
        { text: '👤 QR', callback_data: 'qr' },
        { text: '🎰 Регистрация на ближайшую игру', callback_data: 'reg' },
      ],
    ],
  };
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup: any = getMainMenu()
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Cannot send Telegram message.');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`❌ Telegram API error sendTelegramMessage (status ${res.status}):`, data.description || data);
    }
    return data.ok === true;
  } catch (err) {
    console.error('Error sending Telegram message:', err);
    return false;
  }
}

export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  replyMarkup: any = getMainMenu()
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set. Cannot send Telegram photo.');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        reply_markup: replyMarkup,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`❌ Telegram API error sendTelegramPhoto (status ${res.status}):`, data.description || data);
    }
    return data.ok === true;
  } catch (err) {
    console.error('Error sending Telegram photo:', err);
    return false;
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('Error answering callback query:', err);
    return false;
  }
}

export async function getWebhookInfo(): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set.');
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is missing' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    return await res.json();
  } catch (err: any) {
    console.error('Error getting Telegram webhook info:', err);
    return { ok: false, error: err?.message || 'Failed to fetch webhook info' };
  }
}

export async function deleteWebhook(): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN is not set.');
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is missing' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
    const data = await res.json();
    console.log('Результат deleteWebhook:', data);
    return data;
  } catch (err: any) {
    console.error('Error deleting Telegram webhook:', err);
    return { ok: false, error: err?.message || 'Failed to delete webhook' };
  }
}

export async function syncWebhook(options?: { force?: boolean }): Promise<any> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;

  if (!token) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан в переменных окружения.');
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is missing' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : 'https://baza-pink.vercel.app';

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  console.log(`🔄 Синхронизация Telegram Webhook URL: ${webhookUrl}`);
  console.log(`🔑 Наличие секретного токена: ${secretToken ? 'Да (скрыт)' : 'Нет'}`);

  try {
    if (options?.force) {
      console.log('🗑 Удаление старого вебхука перед установкой нового...');
      await deleteWebhook();
    } else {
      const currentInfo = await getWebhookInfo();
      const isUrlMatch = currentInfo?.ok && currentInfo?.result?.url === webhookUrl;
      const noPendingUpdates = !(currentInfo?.result?.pending_update_count > 0);

      if (isUrlMatch && noPendingUpdates) {
        console.log('✅ Webhook уже установлен и совпадает с текущим URL.');
        return {
          setWebhookResult: { ok: true, result: true, description: 'Already set' },
          webhookInfo: currentInfo,
          skipped: true,
        };
      }
    }

    const body: Record<string, any> = {
      url: webhookUrl,
      allowed_updates: ['message', 'edited_message', 'callback_query', 'my_chat_member', 'chat_member'],
      drop_pending_updates: false,
    };

    if (secretToken && secretToken.trim() !== '') {
      body.secret_token = secretToken;
    }

    const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const setData = await setRes.json();
    console.log('Результат setWebhook:', setData);

    const info = await getWebhookInfo();
    console.log('Текущий статус getWebhookInfo:', info);

    return { setWebhookResult: setData, webhookInfo: info };
  } catch (err: any) {
    console.error('❌ Ошибка при синхронизации вебхука Telegram:', err);
    return { ok: false, error: err?.message || 'Sync failed' };
  }
}

export function parseGameDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const ruMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 0;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    return new Date(year, month, day, hours, minutes);
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNickForSearch(nick?: string): string {
  if (!nick) return '';
  return String(nick)
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/ё/g, 'е')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
}

export async function linkTelegramId(
  update: any,
  sheetsApi: SheetsService = { readSheet, updateRow, writeRow }
): Promise<{
  matchedPlayer: any | null;
  fromId: string;
  chatId: string;
  payload?: string;
  duplicateConflict?: boolean;
  confirmedLink?: boolean;
  alreadyLinked?: boolean;
}> {
  const tgUser =
    update.message?.from ||
    update.callback_query?.from ||
    update.my_chat_member?.from ||
    update.chat_member?.from ||
    update.my_chat_member?.chat ||
    update.chat_member?.chat;

  const fromId = tgUser?.id ? String(tgUser.id) : '';

  const chatId = update.message?.chat?.id
    ? String(update.message.chat.id)
    : update.callback_query?.message?.chat?.id
    ? String(update.callback_query.message.chat.id)
    : update.my_chat_member?.chat?.id
    ? String(update.my_chat_member.chat.id)
    : update.chat_member?.chat?.id
    ? String(update.chat_member.chat.id)
    : fromId;

  if (!fromId) {
    return { matchedPlayer: null, fromId: '', chatId: '' };
  }

  // Extract payload if /start
  let payload = '';
  if (update.message?.text && /^\/start(\s|$)/i.test(update.message.text.trim())) {
    const fullText = String(update.message.text).trim();
    const rawPayload = fullText.replace(/^\/start\s*/i, '').trim();
    if (rawPayload) {
      try {
        payload = decodeURIComponent(rawPayload);
      } catch {
        payload = rawPayload;
      }
    }
  }

  // Extract User ID if "User ID: xxx"
  let extractedUserId = '';
  if (update.message?.text && update.message.text.includes('User ID:')) {
    const fullText = String(update.message.text);
    extractedUserId = fullText.substring(fullText.indexOf('User ID:') + 8).trim();
  }

  // Extract contact phone
  const contactPhone = update.message?.contact?.phone_number
    ? String(update.message.contact.phone_number).replace(/\D/g, '')
    : '';

  // Extract Telegram User Details
  const tgUsername = tgUser?.username ? normalizeNickForSearch(tgUser.username) : '';
  const tgFirstName = tgUser?.first_name ? normalizeNickForSearch(tgUser.first_name) : '';

  try {
    const players = await sheetsApi.readSheet('Игроки');
    let matchedPlayer: any = null;
    let isExplicitConfirmed = false;

    // 4.1.b Match by existing saved Telegram ID === fromId
    const matchedByTgId = players.find(
      (p) => String(p['Telegram ID'] || '').trim() === fromId
    );
    if (matchedByTgId) {
      matchedPlayer = matchedByTgId;
      isExplicitConfirmed = true;
    }

    // 4.1.a Match by deep-link payload /start <Ник or User ID> or User ID text
    if (!matchedPlayer && (payload || extractedUserId)) {
      const searchTarget = (payload || extractedUserId).trim();
      const searchNorm = normalizeNickForSearch(searchTarget);

      // Check nick collisions first
      const exactNickMatches = players.filter(
        (p) => normalizeNickForSearch(p['Ник']) === searchNorm
      );

      if (exactNickMatches.length > 1) {
        console.warn(`⚠️ дубликат ника, привязка отменена: "${searchTarget}"`);
        return {
          matchedPlayer: null,
          fromId,
          chatId,
          payload,
          duplicateConflict: true,
          confirmedLink: false,
        };
      }

      if (exactNickMatches.length === 1) {
        matchedPlayer = exactNickMatches[0];
        isExplicitConfirmed = true;
      } else {
        // Try exact User ID match
        const userIdMatches = players.filter(
          (p) => normalizeNickForSearch(p['User ID']) === searchNorm
        );
        if (userIdMatches.length === 1) {
          matchedPlayer = userIdMatches[0];
          isExplicitConfirmed = true;
        }
      }
    }

    // 4.1.c Match by shared contact phone
    if (!matchedPlayer && contactPhone) {
      const phoneMatches = players.filter((p) => {
        const pPhone = String(p['Номер телефона'] || p['Телефон'] || '').replace(/\D/g, '');
        return pPhone && (pPhone === contactPhone || pPhone.endsWith(contactPhone) || contactPhone.endsWith(pPhone));
      });

      if (phoneMatches.length === 1) {
        matchedPlayer = phoneMatches[0];
        isExplicitConfirmed = true;
      }
    }

    // Perform writing ONLY if explicit confirmation conditions were met
    if (matchedPlayer && isExplicitConfirmed && matchedPlayer['Ник']) {
      const alreadyLinked = String(matchedPlayer['Telegram ID'] || '').trim() === fromId;

      // Primary key for write: 🔒 Row ID or User ID, falling back to Ник
      const searchKey = matchedPlayer['🔒 Row ID']
        ? '🔒 Row ID'
        : matchedPlayer['User ID']
        ? 'User ID'
        : 'Ник';
      const searchValue = matchedPlayer[searchKey];

      // Re-check collision on Ник
      const targetNickNorm = String(matchedPlayer['Ник']).trim().toLowerCase();
      const sameNickRows = players.filter(
        (p) => String(p['Ник'] || '').trim().toLowerCase() === targetNickNorm
      );

      if (sameNickRows.length > 1) {
        console.warn(`⚠️ дубликат ника, привязка отменена: "${matchedPlayer['Ник']}"`);
        return {
          matchedPlayer: null,
          fromId,
          chatId,
          payload,
          duplicateConflict: true,
          confirmedLink: false,
          alreadyLinked: false,
        };
      }

      // If existing Telegram ID is already fromId, no re-write needed
      if (!alreadyLinked) {
        let writeSuccess = false;
        let attempt = 0;
        const maxAttempts = 3;

        while (!writeSuccess && attempt < maxAttempts) {
          attempt++;
          const res = await sheetsApi.updateRow('Игроки', searchKey, searchValue, {
            'Telegram ID': fromId,
          });

          const freshPlayers = await sheetsApi.readSheet('Игроки');
          const freshRow = freshPlayers.find(
            (p) => String(p[searchKey] || '').trim().toLowerCase() === String(searchValue).trim().toLowerCase()
          );

          if (freshRow && String(freshRow['Telegram ID'] || '').trim() === fromId) {
            writeSuccess = true;
            console.log(`✅ [linkTelegramId] Telegram ID ${fromId} успешно подтвержден в листе Игроки по ${searchKey}="${searchValue}"`);
          } else {
            console.warn(`⚠️ [linkTelegramId] Попытка ${attempt}/${maxAttempts} записи Telegram ID ${fromId} не подтвердилась (API update res: ${res})`);
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }

        if (!writeSuccess) {
          console.error(`❌ [linkTelegramId] НЕ УДАЛОСЬ записать Telegram ID в Google Sheets: fromId=${fromId}, ${searchKey}=${searchValue}`);
        }
      }

      // Sync confirmed Telegram ID to sheet "В клубе"
      try {
        const inClubRows = await sheetsApi.readSheet('В клубе');
        const inClubMatch = inClubRows.find(
          (r) => normalizeNickForSearch(r['Ник']) === targetNickNorm
        );
        if (inClubMatch) {
          await sheetsApi.updateRow('В клубе', 'Ник', inClubMatch['Ник'], {
            'Telegram ID': fromId,
          });
        }
      } catch (e) {
        console.error('Error syncing Telegram ID to "В клубе":', e);
      }

      return { matchedPlayer, fromId, chatId, payload, confirmedLink: true, alreadyLinked };
    }

    return { matchedPlayer, fromId, chatId, payload, confirmedLink: false };
  } catch (err: any) {
    console.error('❌ [linkTelegramId] Ошибка привязки:', err);
    return { matchedPlayer: null, fromId, chatId, payload, confirmedLink: false };
  }
}

// Global in-memory caches for deduplication & debouncing across requests within same process instance
const processedUpdateIds = new Map<number, number>();
const lastStartTimestamps = new Map<string, number>();
const UPDATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupOldUpdateIds() {
  const now = Date.now();
  processedUpdateIds.forEach((timestamp, id) => {
    if (now - timestamp > UPDATE_TTL_MS) {
      processedUpdateIds.delete(id);
    }
  });
}

export async function processTelegramUpdate(
  update: any,
  sheetsApi: SheetsService = { readSheet, updateRow, writeRow }
): Promise<{ handled: boolean; branch?: string; error?: string }> {
  try {
    // 0. Deduplicate update by update_id (TTL ~10 min)
    if (update?.update_id) {
      cleanupOldUpdateIds();
      if (processedUpdateIds.has(update.update_id)) {
        return { handled: true, branch: 'duplicate_update' };
      }
      processedUpdateIds.set(update.update_id, Date.now());
    }

    // Ignore bot self-messages
    if (update.message?.from?.is_bot) {
      return { handled: true, branch: 'self_message' };
    }

    // Service updates (my_chat_member / chat_member)
    const serviceUpdate = update.my_chat_member || update.chat_member;
    if (serviceUpdate) {
      const status = serviceUpdate.new_chat_member?.status;
      const allowedStatuses = ['member', 'creator', 'administrator'];

      if (!allowedStatuses.includes(status)) {
        return { handled: true, branch: 'service_update_ignored' };
      }

      const { matchedPlayer, fromId, chatId, duplicateConflict, confirmedLink } = await linkTelegramId(update, sheetsApi);

      if (duplicateConflict) {
        await sendTelegramMessage(
          chatId,
          'Найдено несколько профилей с таким ником, обратитесь к администратору.',
          getMainMenu()
        );
        return { handled: true, branch: 'duplicate_conflict' };
      }

      if (matchedPlayer && confirmedLink) {
        // Silent link on service update so subsequent /start produces exactly 1 welcome message
        return { handled: true, branch: 'my_chat_member_linked' };
      }

      return { handled: true, branch: 'my_chat_member_unlinked' };
    }

    // 1. Link or lookup Telegram ID
    const { matchedPlayer, fromId, chatId, duplicateConflict, confirmedLink, alreadyLinked, payload } = await linkTelegramId(update, sheetsApi);

    // 4.3. Handle duplicate nickname conflict message
    if (duplicateConflict) {
      await sendTelegramMessage(
        chatId,
        'Найдено несколько профилей с таким ником, обратитесь к администратору.',
        getMainMenu()
      );
      return { handled: true, branch: 'duplicate_conflict' };
    }

    // Branch 0: Deep-link /start <payload> or plain /start
    if (update.message?.text && /^\/start(\s|$)/i.test(update.message.text.trim())) {
      const now = Date.now();
      const lastStartTime = lastStartTimestamps.get(fromId) || 0;
      const isRapidDuplicate = fromId && (now - lastStartTime) < 3000; // < 3 seconds
      if (fromId) {
        lastStartTimestamps.set(fromId, now);
      }

      if (isRapidDuplicate) {
        await sendTelegramMessage(chatId, 'Вы уже подключены.', getMainMenu());
        return { handled: true, branch: '0_start' };
      }

      let welcomeMessage =
        'Добро пожаловать!\n' +
        '🛡 Правовая информация:\n' +
        'Данный сервис не собирает персональные данные (ФИО). Сбор Telegram ID осуществляется добровольно для обеспечения игрового процесса. Мы используем файлы Cookie, чтобы вам не пришлось логиниться каждый раз.\n' +
        'Нажимая кнопку «Старт», вы даете согласие на обработку данных и принимаете Правила клуба.';

      if (matchedPlayer && confirmedLink) {
        if (alreadyLinked && !payload) {
          welcomeMessage += '\n\nВы уже подключены.';
        } else {
          welcomeMessage += `\n\n✅ Ваш Telegram ID ${fromId} привязан к игроку ${matchedPlayer['Ник']}. Уведомления включены.`;
        }
      } else {
        welcomeMessage += `\n\nМы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.`;
      }

      await sendTelegramMessage(chatId, welcomeMessage, getMainMenu());
      return { handled: true, branch: '0_start' };
    }

    // Branch 1: Registration by message containing "User ID:"
    if (update.message?.text && update.message.text.includes('User ID:')) {
      let welcomeMessage =
        'Добро пожаловать!\n' +
        '🛡 Правовая информация:\n' +
        'Данный сервис не собирает персональные данные (ФИО). Сбор Telegram ID осуществляется добровольно для обеспечения игрового процесса. Мы используем файлы Cookie, чтобы вам не пришлось логиниться каждый раз.\n' +
        'Нажимая кнопку «Старт», вы даете согласие на обработку данных и принимаете Правила клуба.';

      if (matchedPlayer && confirmedLink) {
        if (alreadyLinked && !payload) {
          welcomeMessage += '\n\nВы уже подключены.';
        } else {
          welcomeMessage += `\n\n✅ Ваш Telegram ID ${fromId} привязан к игроку ${matchedPlayer['Ник']}. Уведомления включены.`;
        }
      } else {
        welcomeMessage += `\n\nМы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.`;
      }

      await sendTelegramMessage(chatId, welcomeMessage, getMainMenu());
      return { handled: true, branch: '1_registration' };
    }

    // Callback query branches
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = String(callbackQuery.data || '');
      const callbackId = callbackQuery.id;

      // Branch 2: callback "app"
      if (callbackData.includes('app')) {
        await answerCallbackQuery(callbackId);
        await sendTelegramMessage(fromId, 'https://baza64.glide.page', getMainMenu());
        return { handled: true, branch: '2_app' };
      }

      // Branch 3: callback "qr"
      if (callbackData.includes('qr')) {
        await answerCallbackQuery(callbackId);
        if (!matchedPlayer) {
          await sendTelegramMessage(
            fromId,
            'Мы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.',
            getMainMenu()
          );
          return { handled: true, branch: '3_qr' };
        }

        const qrUrl = matchedPlayer?.['QR URL'] || matchedPlayer?.['QR'];
        if (qrUrl && String(qrUrl).startsWith('http')) {
          await sendTelegramPhoto(fromId, String(qrUrl), getMainMenu());
        } else {
          await sendTelegramMessage(fromId, 'QR-код не найден.', getMainMenu());
        }
        return { handled: true, branch: '3_qr' };
      }

      // Branch 4: callback "reg"
      if (callbackData.includes('reg')) {
        await answerCallbackQuery(callbackId);
        if (!matchedPlayer) {
          await sendTelegramMessage(
            fromId,
            'Мы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.',
            getMainMenu()
          );
          return { handled: true, branch: '4_reg' };
        }

        const inClubRows = await sheetsApi.readSheet('В клубе');
        const inClubMatch = inClubRows.find(
          (row) => String(row['Telegram ID']).trim() === fromId
        );

        const playerNick = matchedPlayer['Ник'] || inClubMatch?.['Ник'] || '';

        const gameDates = await sheetsApi.readSheet('Даты ежедневных игр');
        const now = new Date();

        const futureGames = gameDates
          .map((g) => ({
            row: g,
            dateObj: parseGameDate(g['Дата и Время']),
          }))
          .filter((item) => item.dateObj !== null && item.dateObj >= now)
          .sort((a, b) => a.dateObj!.getTime() - b.dateObj!.getTime());

        if (futureGames.length > 0) {
          const nearestGame = futureGames[0].row;
          const gameDateTime = nearestGame['Дата и Время'];
          const tournament = nearestGame['Сезонный турнир'] || nearestGame['Сезонные турниры'] || '';
          const cost = nearestGame['Стоимость'] || '';

          // Append to "🎮 ЕЖЕДНЕВНЫЕ ИГРЫ"
          await sheetsApi.writeRow('🎮 ЕЖЕДНЕВНЫЕ ИГРЫ', {
            'Дата': gameDateTime,
            'Ник': playerNick,
            'Сезонные турниры': tournament,
            'Стоимость': cost,
          });

          // Update status in "В клубе"
          if (inClubMatch) {
            await sheetsApi.updateRow('В клубе', 'Telegram ID', fromId, {
              'Статус': 'Ожидает',
            });
          }

          const responseText = `Вы зарегистрированы на игру ${gameDateTime} Желаем удачи! ⭐️`;
          await sendTelegramMessage(fromId, responseText, getMainMenu());
        } else {
          await sendTelegramMessage(fromId, 'К сожалению, ближайшие запланированные игры не найдены.', getMainMenu());
        }

        return { handled: true, branch: '4_reg' };
      }

      // Branch 5: callback "rating"
      if (callbackData.includes('rating')) {
        await answerCallbackQuery(callbackId);
        if (!matchedPlayer) {
          await sendTelegramMessage(
            fromId,
            'Мы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.',
            getMainMenu()
          );
          return { handled: true, branch: '5_rating' };
        }

        const nick = matchedPlayer['Ник'] || '-';
        const status = matchedPlayer['Статус'] || '-';
        const rating = matchedPlayer['Рейтинг'] !== undefined && matchedPlayer['Рейтинг'] !== ''
          ? matchedPlayer['Рейтинг']
          : matchedPlayer['Общий рейтинг'] ?? 0;
        const place = matchedPlayer['Место'] || '-';

        const statsMessage =
          `Ник: ${nick}\n` +
          `Статус: ${status}\n` +
          `Рейтинг: ${rating}\n` +
          `Место: ${place}`;

        await sendTelegramMessage(fromId, statsMessage, getMainMenu());

        return { handled: true, branch: '5_rating' };
      }
    }

    return { handled: false };
  } catch (err: any) {
    console.error('Error in processTelegramUpdate:', err);
    return { handled: false, error: err?.message || 'Internal error' };
  }
}
