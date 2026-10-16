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
      [
        { text: '🆔 Мой ID', callback_data: 'my_id' },
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
    return data.ok;
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
    return data.ok;
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
      if (
        currentInfo?.ok &&
        currentInfo?.result?.url === webhookUrl
      ) {
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
}> {
  const fromId = update.message?.from?.id
    ? String(update.message.from.id)
    : update.callback_query?.from?.id
    ? String(update.callback_query.from.id)
    : update.my_chat_member?.from?.id
    ? String(update.my_chat_member.from.id)
    : update.chat_member?.from?.id
    ? String(update.chat_member.from.id)
    : '';

  const chatId = update.message?.chat?.id
    ? String(update.message.chat.id)
    : update.callback_query?.message?.chat?.id
    ? String(update.callback_query.message.chat.id)
    : fromId;

  if (!fromId) {
    console.error('❌ [linkTelegramId] fromId is empty in Telegram update');
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
  const tgUser = update.message?.from || update.callback_query?.from || update.my_chat_member?.from || update.chat_member?.from;
  const tgUsername = tgUser?.username ? normalizeNickForSearch(tgUser.username) : '';
  const tgFirstName = tgUser?.first_name ? normalizeNickForSearch(tgUser.first_name) : '';

  try {
    let players = await sheetsApi.readSheet('Игроки');
    let matchedPlayer: any = null;

    // a. Exact match by Telegram ID
    matchedPlayer = players.find(
      (p) => String(p['Telegram ID'] || '').trim() === fromId
    );

    // b. Match by deep-link payload /start <Ник>
    if (!matchedPlayer && payload) {
      const normPayload = normalizeNickForSearch(payload);
      matchedPlayer = players.find((p) => {
        const pNick = normalizeNickForSearch(p['Ник']);
        const pUserId = String(p['User ID'] || '').trim().toLowerCase();
        return pNick === normPayload || pUserId === normPayload;
      });
    }

    // c. Match by User ID from payload or text
    if (!matchedPlayer && extractedUserId) {
      matchedPlayer = players.find(
        (p) => String(p['User ID'] || '').trim() === extractedUserId
      );
    }

    // d. Match by Phone Number
    if (!matchedPlayer && contactPhone) {
      matchedPlayer = players.find((p) => {
        const pPhone = String(p['Номер телефона'] || p['Телефон'] || '').replace(/\D/g, '');
        return pPhone && (pPhone === contactPhone || pPhone.endsWith(contactPhone) || contactPhone.endsWith(pPhone));
      });
    }

    // e. Match by from.username / from.first_name vs Ник / Имя
    if (!matchedPlayer && (tgUsername || tgFirstName)) {
      matchedPlayer = players.find((p) => {
        const pNick = normalizeNickForSearch(p['Ник']);
        const pName = normalizeNickForSearch(p['Имя']);
        return (
          (tgUsername && (pNick === tgUsername || pName === tgUsername)) ||
          (tgFirstName && (pNick === tgFirstName || pName === tgFirstName))
        );
      });
    }

    // If still not matched, but payload nick exists, write new guest/player row with Telegram ID
    if (!matchedPlayer && payload) {
      const cleanNick = payload.replace(/_/g, ' ').trim();
      const newRowData = {
        'Ник': cleanNick,
        'Telegram ID': fromId,
      };
      await sheetsApi.writeRow('Игроки', newRowData);
      players = await sheetsApi.readSheet('Игроки');
      matchedPlayer = players.find((p) => normalizeNickForSearch(p['Ник']) === normalizeNickForSearch(cleanNick));
    }

    // f. If matched — write Telegram ID = fromId in player's row and verify
    if (matchedPlayer && matchedPlayer['Ник']) {
      const actualNick = matchedPlayer['Ник'];

      let writeSuccess = false;
      let attempt = 0;
      const maxAttempts = 3;

      while (!writeSuccess && attempt < maxAttempts) {
        attempt++;
        const res = await sheetsApi.updateRow('Игроки', 'Ник', actualNick, {
          'Telegram ID': fromId,
        });

        // Re-read row from Google Sheets to verify
        const freshPlayers = await sheetsApi.readSheet('Игроки');
        const freshRow = freshPlayers.find((p) => String(p['Ник'] || '').trim().toLowerCase() === String(actualNick).trim().toLowerCase());

        if (freshRow && String(freshRow['Telegram ID'] || '').trim() === fromId) {
          writeSuccess = true;
          console.log(`✅ [linkTelegramId] Telegram ID ${fromId} успешно подтвержден в листе Игроки для "${actualNick}" на попытке ${attempt}`);
        } else {
          console.warn(`⚠️ [linkTelegramId] Попытка ${attempt}/${maxAttempts} записи Telegram ID ${fromId} для "${actualNick}" не подтвердилась (API update res: ${res})`);
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      if (!writeSuccess) {
        console.error(`❌ [linkTelegramId] НЕ УДАЛОСЬ записать Telegram ID в Google Sheets: fromId=${fromId}, chatId=${chatId}, nick=${actualNick}`);
      }

      // Duplicate Telegram ID to sheet "В клубе"
      try {
        const inClubRows = await sheetsApi.readSheet('В клубе');
        const inClubMatch = inClubRows.find(
          (r) => normalizeNickForSearch(r['Ник']) === normalizeNickForSearch(actualNick)
        );
        if (inClubMatch) {
          await sheetsApi.updateRow('В клубе', 'Ник', inClubMatch['Ник'], {
            'Telegram ID': fromId,
          });
        }
      } catch (e) {
        console.error('Error syncing Telegram ID to "В клубе":', e);
      }
    }

    return { matchedPlayer, fromId, chatId, payload };
  } catch (err: any) {
    console.error('❌ [linkTelegramId] Ошибка автопривязки:', err);
    return { matchedPlayer: null, fromId, chatId, payload };
  }
}

export async function processTelegramUpdate(
  update: any,
  sheetsApi: SheetsService = { readSheet, updateRow, writeRow }
): Promise<{ handled: boolean; branch?: string; error?: string }> {
  try {
    // 1. Always execute linkTelegramId on EVERY update
    const { matchedPlayer, fromId, chatId, payload } = await linkTelegramId(update, sheetsApi);

    // Branch my_id: command /myid or callback_query "my_id"
    const isMyIdMessage = update.message?.text && /^\/myid(\s|$)/i.test(update.message.text.trim());
    const isMyIdCallback = update.callback_query && String(update.callback_query.data || '').includes('my_id');

    if (isMyIdMessage || isMyIdCallback) {
      if (update.callback_query) {
        await answerCallbackQuery(update.callback_query.id);
      }

      if (matchedPlayer) {
        const msg =
          `🆔 Ваш Telegram ID: ${fromId}\n` +
          `👤 Привязанный профиль: ${matchedPlayer['Ник']}\n` +
          `✅ Запись в колонке «Telegram ID» листа «Игроки» подтверждена.`;
        await sendTelegramMessage(chatId, msg, getMainMenu());
      } else {
        const msg =
          `🆔 Ваш Telegram ID: ${fromId}\n` +
          `Мы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически.`;
        await sendTelegramMessage(chatId, msg, getMainMenu());
      }
      return { handled: true, branch: 'my_id' };
    }

    // Branch 0: Deep-link /start <payload> or plain /start
    if (update.message?.text && /^\/start(\s|$)/i.test(update.message.text.trim())) {
      let welcomeMessage =
        'Добро пожаловать!\n' +
        '🛡 Правовая информация:\n' +
        'Данный сервис не собирает персональные данные (ФИО). Сбор Telegram ID осуществляется добровольно для обеспечения игрового процесса. Мы используем файлы Cookie, чтобы вам не пришлось логиниться каждый раз.\n' +
        'Нажимая кнопку «Старт», вы даете согласие на обработку данных и принимаете Правила клуба.';

      if (matchedPlayer) {
        welcomeMessage += `\n\n✅ Ваш Telegram ID ${fromId} привязан к игроку ${matchedPlayer['Ник']}. Уведомления включены.`;
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

      if (matchedPlayer) {
        welcomeMessage += `\n\n✅ Ваш Telegram ID ${fromId} привязан к игроку ${matchedPlayer['Ник']}. Уведомления включены.`;
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
