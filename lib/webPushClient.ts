'use client';

export function getWebPushFlagClient(player: Record<string, any> | null | undefined): string {
  if (!player) return '';
  if (player['Веб-уведомления'] !== undefined && player['Веб-уведомления'] !== null) {
    return String(player['Веб-уведомления']).trim();
  }
  const key = Object.keys(player).find((k) => {
    const norm = String(k || '').replace(/[^a-zA-Z0-9а-яА-Я]/g, '').toLowerCase();
    return norm === 'вебуведомления';
  });
  return key ? String(player[key] || '').trim() : '';
}

export function isPushAllowedClient(player: Record<string, any> | null | undefined): boolean {
  if (!player) return false;
  const rawFlag = getWebPushFlagClient(player);
  if (!rawFlag) return false;

  const cleanFlag = rawFlag
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')
    .trim()
    .toLowerCase();

  const isExplicitlyDisabled = ['запрещено', 'denied', 'false', '0', 'нет', 'off', 'disabled'].includes(cleanFlag);
  if (isExplicitlyDisabled) return false;

  const isAllowedPrefix =
    cleanFlag.startsWith('разрешено') ||
    cleanFlag.startsWith('true') ||
    cleanFlag.startsWith('yes') ||
    cleanFlag.startsWith('✓');
  const hasSubPayload = rawFlag.includes('|') || rawFlag.includes('{') || rawFlag.includes('endpoint');

  return isAllowedPrefix || hasSubPayload;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function syncWebPushSubscription(user: any): Promise<boolean> {
  if (typeof window === 'undefined' || !user) return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();

    // Never automatically call pushManager.subscribe without explicit user consent.
    return !!sub;
  } catch (err) {
    console.error('syncWebPushSubscription error:', err);
  }
  return false;
}
