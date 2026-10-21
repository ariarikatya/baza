import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { sendWebPushNotification, isPushAllowed, toAbsoluteUrl } from '@/lib/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, text, body: messageBody, url, icon, badge } = body;

    const players = await readSheet('Игроки');
    let sentCount = 0;

    for (const p of players) {
      if (isPushAllowed(p)) {
        const subStr = p['Push Subscription'];
        const keyName = p['🔒 Row ID'] ? '🔒 Row ID' : p['User ID'] ? 'User ID' : 'Ник';
        const keyValue = p[keyName];

        const res = await sendWebPushNotification(
          subStr,
          {
            title: title || 'Покерный клуб БАЗА',
            body: messageBody || text || '',
            url: url || '/',
            icon: toAbsoluteUrl(icon || '/icons/logo.png'),
            badge: toAbsoluteUrl(badge || '/icons/logo.png'),
          },
          { keyName, keyValue }
        );

        if (res.success) sentCount++;
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Push send API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
