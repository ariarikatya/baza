import webPush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@baza.ru';

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('Error setting VAPID details:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

export interface SendPushResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  cleanedUp?: boolean;
}

export async function sendWebPushNotification(
  subscriptionJsonStr: string,
  payload: PushPayload,
  playerIdentifier?: { keyName: string; keyValue: string }
): Promise<SendPushResult> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn(
      '⚠️ Web Push notification skipped: VAPID ключи не настроены в окружении. Требуются переменные NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT.'
    );
    return { success: false, error: 'VAPID ключи не настроены в Vercel Environment Variables' };
  }

  if (!subscriptionJsonStr) {
    return { success: false, error: 'Пустая подписка' };
  }

  const notificationPayload = {
    title: payload.title || 'Покерный клуб БАЗА',
    body: payload.body || '',
    url: payload.url || '/',
    icon: payload.icon || '/icons/192.png',
    badge: payload.badge || '/icons/192.png',
  };

  const pushOptions = {
    TTL: 24 * 3600, // 24 hours
    urgency: 'high' as const,
  };

  try {
    const subscription = JSON.parse(subscriptionJsonStr);
    await webPush.sendNotification(subscription, JSON.stringify(notificationPayload), pushOptions);
    return { success: true };
  } catch (err: any) {
    const statusCode = err?.statusCode;
    console.error(`❌ Failed to send Web Push notification (status ${statusCode}):`, err?.message || err);

    let cleanedUp = false;

    if ((statusCode === 404 || statusCode === 410) && playerIdentifier) {
      try {
        console.log(`🗑️ Removing expired push subscription for player (${playerIdentifier.keyName}=${playerIdentifier.keyValue})`);
        const { updateRow } = await import('@/lib/googleSheets');
        await updateRow('Игроки', playerIdentifier.keyName, playerIdentifier.keyValue, {
          'Веб-уведомления': 'Запрещено',
          'Push Subscription': '',
        });
        cleanedUp = true;
      } catch (cleanupErr) {
        console.error('Failed to cleanup expired subscription in Google Sheets:', cleanupErr);
      }
    }

    return {
      success: false,
      statusCode,
      error: err?.message || 'Push send error',
      cleanedUp,
    };
  }
}

export interface BroadcastWebPushOptions {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  playerNicks?: string[];
}

export async function broadcastWebPush(options: BroadcastWebPushOptions): Promise<{
  total: number;
  sent: number;
  failed: number;
  cleaned: number;
}> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('⚠️ Web Push broadcast skipped: VAPID ключи не настроены.');
    return { total: 0, sent: 0, failed: 0, cleaned: 0 };
  }

  let players: any[] = [];
  try {
    const { readSheet } = await import('@/lib/googleSheets');
    players = await readSheet('Игроки');
  } catch (err) {
    console.error('Error reading Players sheet in broadcastWebPush:', err);
    return { total: 0, sent: 0, failed: 0, cleaned: 0 };
  }

  const targetNicks = options.playerNicks
    ? new Set(options.playerNicks.map((n) => n.trim().toLowerCase()))
    : null;

  let totalCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let cleanedCount = 0;

  for (const player of players) {
    const nick = String(player['Ник'] || '').trim();
    if (targetNicks && !targetNicks.has(nick.toLowerCase())) {
      continue;
    }

    const isAllowed = String(player['Веб-уведомления'] || '').trim().toLowerCase() === 'разрешено';
    const subStr = player['Push Subscription'];

    if (!isAllowed || !subStr) continue;

    const keyName = player['🔒 Row ID'] ? '🔒 Row ID' : player['User ID'] ? 'User ID' : 'Ник';
    const keyValue = player[keyName];

    let subs: any[] = [];
    try {
      const parsed = JSON.parse(subStr);
      subs = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      continue;
    }

    totalCount += subs.length;
    const remainingSubs: any[] = [];

    for (const subObj of subs) {
      const singleSubStr = JSON.stringify(subObj);
      const res = await sendWebPushNotification(singleSubStr, {
        title: options.title,
        body: options.body,
        url: options.url || '/',
        icon: options.icon || '/icons/192.png',
        badge: options.badge || '/icons/192.png',
      });

      if (res.success) {
        sentCount++;
        remainingSubs.push(subObj);
      } else {
        failedCount++;
        if (res.statusCode === 404 || res.statusCode === 410) {
          cleanedCount++;
          console.log(`🗑️ Removing expired subscription endpoint for player ${nick}`);
        } else {
          remainingSubs.push(subObj);
        }
      }
    }

    if (remainingSubs.length !== subs.length) {
      try {
        const { updateRow } = await import('@/lib/googleSheets');
        if (remainingSubs.length === 0) {
          await updateRow('Игроки', keyName, keyValue, {
            'Веб-уведомления': 'Запрещено',
            'Push Subscription': '',
          });
        } else {
          await updateRow('Игроки', keyName, keyValue, {
            'Push Subscription': JSON.stringify(remainingSubs.length === 1 ? remainingSubs[0] : remainingSubs),
          });
        }
      } catch (cleanErr) {
        console.error('Error updating player subscription cleanup in sheets:', cleanErr);
      }
    }
  }

  console.log(
    `📢 [broadcastWebPush] Title: "${options.title}" | Sent: ${sentCount}, Failed: ${failedCount}, Cleaned: ${cleanedCount}`
  );

  return { total: totalCount, sent: sentCount, failed: failedCount, cleaned: cleanedCount };
}
