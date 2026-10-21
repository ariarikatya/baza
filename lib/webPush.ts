import webPush from 'web-push';
import crypto from 'crypto';
import { recordPushError, recordLastPushStats } from '@/lib/pushDiagnosticsStore';

export function checkVapidKeyPairMatch(pubKeyBase64Url?: string, privKeyBase64Url?: string): boolean {
  const pub = pubKeyBase64Url || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const priv = privKeyBase64Url || process.env.VAPID_PRIVATE_KEY || '';

  if (!pub || !priv) return false;

  try {
    const cleanPub = pub.trim();
    const cleanPriv = priv.trim();

    const pubBuffer = Buffer.from(cleanPub, 'base64url');
    if (pubBuffer.length !== 65 || pubBuffer[0] !== 0x04) {
      return false;
    }

    const pubXBase64Url = pubBuffer.subarray(1, 33).toString('base64url');

    const privBuffer = Buffer.from(cleanPriv, 'base64url');
    let privateKeyObj: crypto.KeyObject;

    if (privBuffer.length === 32) {
      privateKeyObj = crypto.createPrivateKey({
        key: {
          kty: 'EC',
          crv: 'P-256',
          d: cleanPriv,
        },
        format: 'jwk',
      });
    } else {
      privateKeyObj = crypto.createPrivateKey(privBuffer);
    }

    const publicKeyObj = crypto.createPublicKey(privateKeyObj);
    const jwk = publicKeyObj.export({ format: 'jwk' });

    if (jwk.x) {
      return jwk.x === pubXBase64Url;
    }
  } catch (err) {
    console.error('VAPID key match error:', err);
  }

  return false;
}

export function toAbsoluteUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baza-pink.vercel.app';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export function isPushAllowed(player: any): boolean {
  if (!player) return false;
  const nick = String(player['Ник'] || 'Неизвестный').trim();
  const subStr = player['Push Subscription'];
  if (!subStr || String(subStr).trim() === '') {
    return false;
  }

  const flagStr = String(player['Веб-уведомления'] || '').trim().toLowerCase();
  const isExplicitlyDisabled = ['запрещено', 'denied', 'false', '0', 'нет'].includes(flagStr);
  if (isExplicitlyDisabled) {
    console.log(`[push] no subscriber for nick=${nick} reason=explicitly_disabled (flag="${flagStr}")`);
    return false;
  }
  return true;
}

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@baza.ru';

function initVapid() {
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (err) {
      console.error('Error setting VAPID details:', err);
    }
  }
}

initVapid();

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
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || vapidPublicKey;
  const privKey = process.env.VAPID_PRIVATE_KEY || vapidPrivateKey;

  if (!pubKey || !privKey) {
    console.warn(
      '⚠️ Web Push notification skipped: VAPID ключи не настроены в окружении. Требуются переменные NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT.'
    );
    return { success: false, error: 'VAPID ключи не настроены в Vercel Environment Variables' };
  }

  initVapid();

  if (!subscriptionJsonStr) {
    return { success: false, error: 'Пустая подписка' };
  }

  let defaultIcon = '/icons/logo.png';
  try {
    const { getClubLogoUrl } = await import('@/lib/clubSettings');
    const logoUrl = await getClubLogoUrl();
    if (logoUrl && logoUrl.startsWith('http')) {
      defaultIcon = logoUrl;
    }
  } catch (e) {}

  const notificationPayload = {
    title: payload.title || 'Покерный клуб БАЗА',
    body: payload.body || '',
    url: payload.url || '/',
    icon: toAbsoluteUrl(payload.icon || defaultIcon),
    badge: toAbsoluteUrl(payload.badge || defaultIcon),
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
    recordPushError(err);

    const isExpired = statusCode === 404 || statusCode === 410;

    return {
      success: false,
      statusCode,
      error: err?.message || 'Push send error',
      cleanedUp: isExpired,
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
  eventName?: string;
}

export async function broadcastWebPush(options: BroadcastWebPushOptions): Promise<{
  total: number;
  sent: number;
  failed: number;
  cleaned: number;
}> {
  const event = options.eventName || (
    options.url?.includes('chat') ? 'chat' :
    options.url?.includes('news') ? 'news' :
    options.url?.includes('tournaments') ? 'game' : 'general'
  );
  const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || vapidPublicKey;
  const privKey = process.env.VAPID_PRIVATE_KEY || vapidPrivateKey;

  if (!pubKey || !privKey) {
    console.warn('⚠️ Web Push broadcast skipped: VAPID ключи не настроены.');
    return { total: 0, sent: 0, failed: 0, cleaned: 0 };
  }

  initVapid();

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

  let defaultBroadcastIcon = '/icons/logo.png';
  try {
    const { getClubLogoUrl } = await import('@/lib/clubSettings');
    const logoUrl = await getClubLogoUrl();
    if (logoUrl && logoUrl.startsWith('http')) {
      defaultBroadcastIcon = logoUrl;
    }
  } catch (e) {}

  for (const player of players) {
    const nick = String(player['Ник'] || '').trim().toLowerCase();
    const email = String(player['Email'] || '').trim().toLowerCase();
    const userId = String(player['User ID'] || '').trim().toLowerCase();
    const rowId = String(player['🔒 Row ID'] || '').trim().toLowerCase();

    const isMatch =
      !targetNicks ||
      (nick && targetNicks.has(nick)) ||
      (email && targetNicks.has(email)) ||
      (userId && targetNicks.has(userId)) ||
      (rowId && targetNicks.has(rowId));

    if (!isMatch) {
      continue;
    }

    if (!isPushAllowed(player)) continue;

    try {
      const parsed = JSON.parse(player['Push Subscription']);
      const subs = Array.isArray(parsed) ? parsed : [parsed];
      totalCount += subs.length;
    } catch (e) {}
  }

  if (totalCount === 0) {
    const reason = options.playerNicks?.length
      ? `no_eligible_subscriber_for_targets (${options.playerNicks.join(', ')})`
      : 'no_subscribers';
    console.log(`[push] skipped reason=${reason} event=${event}`);
    recordLastPushStats({ event, subscribersFound: 0, sent: 0, failed: 0, cleaned: 0, skipReason: reason });
    return { total: 0, sent: 0, failed: 0, cleaned: 0 };
  }

  totalCount = 0; // Reset counter for actual iteration loop

  for (const player of players) {
    const nick = String(player['Ник'] || '').trim().toLowerCase();
    const email = String(player['Email'] || '').trim().toLowerCase();
    const userId = String(player['User ID'] || '').trim().toLowerCase();
    const rowId = String(player['🔒 Row ID'] || '').trim().toLowerCase();

    const isMatch =
      !targetNicks ||
      (nick && targetNicks.has(nick)) ||
      (email && targetNicks.has(email)) ||
      (userId && targetNicks.has(userId)) ||
      (rowId && targetNicks.has(rowId));

    if (!isMatch) {
      continue;
    }

    if (!isPushAllowed(player)) continue;

    const keyName = player['🔒 Row ID'] ? '🔒 Row ID' : player['User ID'] ? 'User ID' : 'Ник';
    const keyValue = player[keyName];

    let subs: any[] = [];
    try {
      const parsed = JSON.parse(player['Push Subscription']);
      subs = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      continue;
    }

    totalCount += subs.length;
    const remainingSubs: any[] = [];

    for (const subObj of subs) {
      const singleSubStr = JSON.stringify(subObj);
      const res = await sendWebPushNotification(
        singleSubStr,
        {
          title: options.title,
          body: options.body,
          url: options.url || '/',
          icon: toAbsoluteUrl(options.icon || defaultBroadcastIcon),
          badge: toAbsoluteUrl(options.badge || defaultBroadcastIcon),
        },
        { keyName, keyValue }
      );

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
        await updateRow('Игроки', keyName, keyValue, {
          'Push Subscription': remainingSubs.length === 0 ? '' : JSON.stringify(remainingSubs.length === 1 ? remainingSubs[0] : remainingSubs),
        });
      } catch (cleanErr) {
        console.error('Error updating player subscription cleanup in sheets:', cleanErr);
      }
    }
  }

  console.log(
    `[push] event=${event} total=${totalCount} sent=${sentCount} failed=${failedCount} cleaned=${cleanedCount}`
  );

  recordLastPushStats({
    event,
    subscribersFound: totalCount,
    sent: sentCount,
    failed: failedCount,
    cleaned: cleanedCount,
  });

  return { total: totalCount, sent: sentCount, failed: failedCount, cleaned: cleanedCount };
}
