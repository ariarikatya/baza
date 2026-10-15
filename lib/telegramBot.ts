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
      allowed_updates: ['message', 'edited_message', 'callback_query', 'my_chat_member'],
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

export async function processTelegramUpdate(
  update: any,
  sheetsApi: SheetsService = { readSheet, updateRow, writeRow }
): Promise<{ handled: boolean; branch?: string; error?: string }> {
  try {
    const fromId = update.message?.from?.id
      ? String(update.message.from.id)
      : update.callback_query?.from?.id
      ? String(update.callback_query.from.id)
      : update.message?.chat?.id
      ? String(update.message.chat.id)
      : '';

    const chatId = update.message?.chat?.id
      ? String(update.message.chat.id)
      : update.callback_query?.message?.chat?.id
      ? String(update.callback_query.message.chat.id)
      : fromId;

    // Branch my_id: command /myid or callback_query "my_id"
    const isMyIdMessage = update.message?.text && /^\/myid(\s|$)/i.test(update.message.text.trim());
    const isMyIdCallback = update.callback_query && String(update.callback_query.data || '').includes('my_id');

    if (isMyIdMessage || isMyIdCallback) {
      if (update.callback_query) {
        await answerCallbackQuery(update.callback_query.id);
      }

      try {
        const players = await sheetsApi.readSheet('Игроки');
        const matchedPlayer = players.find(
          (p) => String(p['Telegram ID'] || '').trim() === fromId
        );

        if (matchedPlayer) {
          await sheetsApi.updateRow('Игроки', 'Ник', matchedPlayer['Ник'], {
            'Telegram ID': fromId,
          });

          const msg =
            `🆔 Ваш Telegram ID: ${fromId}\n` +
            `👤 Привязанный профиль: ${matchedPlayer['Ник']}\n` +
            `✅ Запись в колонке «Telegram ID» листа «Игроки» подтверждена.`;
          await sendTelegramMessage(chatId, msg, getMainMenu());
        } else {
          const msg =
            `🆔 Ваш Telegram ID: ${fromId}\n` +
            `⚠️ Профиль с таким Telegram ID не найден в базе.\n\n` +
            `Чтобы привязать профиль, используйте команду:\n` +
            `/start <Ваш_Ник>`;
          await sendTelegramMessage(chatId, msg, getMainMenu());
        }
      } catch (err: any) {
        console.error('Error in my_id handler:', err);
        await sendTelegramMessage(chatId, `🆔 Ваш Telegram ID: ${fromId}`, getMainMenu());
      }
      return { handled: true, branch: 'my_id' };
    }

    // Branch 0: Deep-link /start <payload> or plain /start
    if (update.message?.text && /^\/start(\s|$)/i.test(update.message.text.trim())) {
      const fullText = String(update.message.text).trim();
      const rawPayload = fullText.replace(/^\/start\s*/i, '').trim();
      let payload = rawPayload;
      if (rawPayload) {
        try {
          payload = decodeURIComponent(rawPayload);
        } catch {
          payload = rawPayload;
        }
      }

      let welcomeMessage =
        'Добро пожаловать!\n' +
        '🛡 Правовая информация:\n' +
        'Данный сервис не собирает персональные данные (ФИО). Сбор Telegram ID осуществляется добровольно для обеспечения игрового процесса. Мы используем файлы Cookie, чтобы вам не пришлось логиниться каждый раз.\n' +
        'Нажимая кнопку «Старт», вы даете согласие на обработку данных и принимаете Правила клуба.';

      try {
        const players = await sheetsApi.readSheet('Игроки');
        let matchedPlayer = null;

        if (payload) {
          const normPayload = payload.trim().toLowerCase();
          const normPayloadSpace = normPayload.replace(/_/g, ' ');
          matchedPlayer = players.find((p) => {
            const pNick = String(p['Ник'] || '').trim().toLowerCase();
            const pUserId = String(p['User ID'] || '').trim().toLowerCase();
            return pNick === normPayload || pUserId === normPayload || pNick === normPayloadSpace;
          });
        }

        // Если без payload или игрока не нашли по payload, ищем игрока с этим fromId
        if (!matchedPlayer && fromId) {
          matchedPlayer = players.find(
            (p) => String(p['Telegram ID'] || '').trim() === fromId
          );
        }

        if (matchedPlayer) {
          const searchKey = 'Ник';
          const searchValue = matchedPlayer['Ник'];
          const updateRes = await sheetsApi.updateRow('Игроки', searchKey, searchValue, {
            'Telegram ID': fromId,
          });
          console.log(`✅ Telegram ID ${fromId} успешно сохранен в колонку «Telegram ID» листа «Игроки» для "${matchedPlayer['Ник']}":`, updateRes);

          const playerNick = matchedPlayer['Ник'];
          if (playerNick) {
            const inClubRows = await sheetsApi.readSheet('В клубе');
            const matchedInClub = inClubRows.find(
              (r) => String(r['Ник'] || '').trim().toLowerCase() === String(playerNick).trim().toLowerCase()
            );
            if (matchedInClub) {
              await sheetsApi.updateRow('В клубе', 'Ник', matchedInClub['Ник'], {
                'Telegram ID': fromId,
              });
            }
          }

          if (payload) {
            welcomeMessage += `\n\n✅ Аккаунт «${matchedPlayer['Ник']}» привязан (Telegram ID: ${fromId}).`;
          }
        } else if (payload) {
          const cleanNick = payload.replace(/_/g, ' ').trim();
          const writeRes = await sheetsApi.writeRow('Игроки', {
            'Ник': cleanNick,
            'Telegram ID': fromId,
          });
          console.log(`✅ Создана новая строка игрока "${cleanNick}" с Telegram ID ${fromId}:`, writeRes);
          welcomeMessage += `\n\n✅ Аккаунт «${cleanNick}» создан и привязан (Telegram ID: ${fromId}).`;
        } else {
          console.log(`ℹ️ Команда /start от Telegram ID ${fromId} без payload, соответствующий профиль не найден.`);
        }
      } catch (err) {
        console.error('Error linking player account in Google Sheets:', err);
      }

      await sendTelegramMessage(chatId, welcomeMessage, getMainMenu());
      return { handled: true, branch: '0_start' };
    }

    // Branch 1: Registration by message containing "User ID:"
    if (update.message?.text && update.message.text.includes('User ID:')) {
      const fullText = String(update.message.text);
      const extractedId = fullText.substring(fullText.indexOf('User ID:') + 8).trim();
      const chatId = String(update.message.chat.id);

      const players = await sheetsApi.readSheet('Игроки');
      const playerMatch = players.find(
        (p) => String(p['User ID']).trim() === extractedId
      );

      if (playerMatch) {
        await sheetsApi.updateRow('Игроки', 'User ID', extractedId, {
          'Telegram ID': chatId,
        });
      }

      const welcomeMessage =
        'Добро пожаловать!\n' +
        '🛡 Правовая информация:\n' +
        'Данный сервис не собирает персональные данные (ФИО). Сбор Telegram ID осуществляется добровольно для обеспечения игрового процесса. Мы используем файлы Cookie, чтобы вам не пришлось логиниться каждый раз.\n' +
        'Нажимая кнопку «Старт», вы даете согласие на обработку данных и принимаете Правила клуба.';

      await sendTelegramMessage(chatId, welcomeMessage, getMainMenu());
      return { handled: true, branch: '1_registration' };
    }

    // Callback query branches
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = String(callbackQuery.data || '');
      const fromId = String(callbackQuery.from.id);
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
        const players = await sheetsApi.readSheet('Игроки');
        const playerMatch = players.find(
          (p) => String(p['Telegram ID']).trim() === fromId
        );

        const qrUrl = playerMatch?.['QR URL'] || playerMatch?.['QR'];
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
        const inClubRows = await sheetsApi.readSheet('В клубе');
        const inClubMatch = inClubRows.find(
          (row) => String(row['Telegram ID']).trim() === fromId
        );

        const players = await sheetsApi.readSheet('Игроки');
        const playerMatch = players.find(
          (p) => String(p['Telegram ID']).trim() === fromId
        );

        const playerNick = playerMatch?.['Ник'] || inClubMatch?.['Ник'] || '';

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
        const players = await sheetsApi.readSheet('Игроки');
        const playerMatch = players.find(
          (p) => String(p['Telegram ID']).trim() === fromId
        );

        const seasonalTournaments = await sheetsApi.readSheet('Сезонные турниры');
        const hasActiveTournament = seasonalTournaments.some((t) => {
          const finishValue = String(t['Завершить турнир'] || '').toLowerCase();
          const finishedNumeric = Number(t['Завершено']);
          return finishValue !== 'true' && finishedNumeric !== 1;
        });

        if (playerMatch) {
          const nick = playerMatch['Ник'] || '-';
          const status = playerMatch['Статус'] || '-';
          const rating = playerMatch['Рейтинг'] !== undefined && playerMatch['Рейтинг'] !== ''
            ? playerMatch['Рейтинг']
            : playerMatch['Общий рейтинг'] ?? 0;
          const place = playerMatch['Место'] || '-';

          const statsMessage =
            `Ник: ${nick}\n` +
            `Статус: ${status}\n` +
            `Рейтинг: ${rating}\n` +
            `Место: ${place}`;

          await sendTelegramMessage(fromId, statsMessage, getMainMenu());
        } else {
          await sendTelegramMessage(fromId, 'Информация о вашем профиле не найдена.', getMainMenu());
        }

        return { handled: true, branch: '5_rating' };
      }
    }

    return { handled: false };
  } catch (err: any) {
    console.error('Error in processTelegramUpdate:', err);
    return { handled: false, error: err?.message || 'Internal error' };
  }
}
