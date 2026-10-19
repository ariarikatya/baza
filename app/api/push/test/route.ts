import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { sendWebPushNotification } from '@/lib/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userNick } = body;

    const players = await readSheet('Игроки');

    // Admin permission check if userNick passed
    if (userNick) {
      const caller = players.find(
        (p) => String(p['Ник'] || '').trim().toLowerCase() === String(userNick).trim().toLowerCase()
      );
      const role = caller?.['Роль'];
      const isAdmin = role === 'Админ' || role === 'Владелец' || caller?.['Админ?'] === true;
      if (!isAdmin) {
        return NextResponse.json({ success: false, error: 'Доступ разрешен только администраторам' }, { status: 403 });
      }
    }

    const details: Array<{ nick: string; success: boolean; statusCode?: number; error?: string; cleanedUp?: boolean }> = [];
    let sent = 0;
    let failed = 0;

    for (const p of players) {
      const nick = p['Ник'] || 'Без ника';
      const isAllowed = String(p['Веб-уведомления'] || '').trim().toLowerCase() === 'разрешено';
      const subStr = p['Push Subscription'];

      if (isAllowed && subStr) {
        const keyName = p['🔒 Row ID'] ? '🔒 Row ID' : p['User ID'] ? 'User ID' : 'Ник';
        const keyValue = p[keyName];

        const res = await sendWebPushNotification(
          subStr,
          {
            title: '🧪 Тестовое Push-уведомление',
            body: `Привет, ${nick}! Проверка доставки Web Push уведомлений ПК БАЗА ♠`,
            url: '/profile',
            icon: '/icons/icon-192x192.png',
          },
          { keyName, keyValue }
        );

        if (res.success) {
          sent++;
          details.push({ nick, success: true });
        } else {
          failed++;
          details.push({
            nick,
            success: false,
            statusCode: res.statusCode,
            error: res.error,
            cleanedUp: res.cleanedUp,
          });
        }
      }
    }

    console.log('📊 Push Test Executed:', JSON.stringify({ total: details.length, sent, failed, details }));

    return NextResponse.json({
      success: true,
      total: details.length,
      sent,
      failed,
      details,
    });
  } catch (error: any) {
    console.error('Push test API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
