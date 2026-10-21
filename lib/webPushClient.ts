'use client';

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
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub && (isStandaloneMode || Notification.permission === 'granted')) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidPublicKey) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
          });
        } catch (err) {
          console.warn('Auto-resubscription failed:', err);
        }
      }
    }

    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          userId: user['User ID'],
          nick: user['Ник'],
          email: user['Email'],
          rowId: user['🔒 Row ID'],
          subscription: sub,
          action: 'auto_resubscribe',
        }),
      }).catch(() => {});
      return true;
    }
  } catch (err) {
    console.error('syncWebPushSubscription error:', err);
  }
  return false;
}
