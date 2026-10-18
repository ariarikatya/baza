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
}

export async function sendWebPushNotification(
  subscriptionJsonStr: string,
  payload: PushPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn(
      '⚠️ Web Push notification skipped: VAPID ключи не настроены в окружении. Требуются переменные NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT.'
    );
    return false;
  }

  if (!subscriptionJsonStr) {
    return false;
  }

  try {
    const subscription = JSON.parse(subscriptionJsonStr);
    await webPush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('Failed to send Web Push notification:', err);
    return false;
  }
}
