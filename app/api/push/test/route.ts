import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { sendWebPushNotification } from '@/lib/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userNick, targetNick } = body;

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
    let cleaned = 0;

    for (const p of players) {
      const nick = p['Ник'] || 'Без ника';

      if (targetNick && nick.toLowerCase() !== String(targetNick).trim().toLowerCase()) {
        continue;
      }

      const isAllowed = ['разрешено', 'true', '1', 'да'].includes(
        String(p['Веб-уведомления'] || '').trim().toLowerCase()
      );
      const subStr = p['Push Subscription'];

      if (isAllowed && subStr) {
        const keyName = p['🔒 Row ID'] ? '🔒 Row ID' : p['User ID'] ? 'User ID' : 'Ник';
        const keyValue = p[keyName];

        let subs: any[] = [];
        try {
          const parsed = JSON.parse(subStr);
          subs = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          continue;
        }

        for (const subObj of subs) {
          const singleSubStr = JSON.stringify(subObj);
          const res = await sendWebPushNotification(
            singleSubStr,
            {
              title: '🧪 Тестовое Push-уведомление',
              body: `Привет, ${nick}! Проверка доставки Web Push уведомлений ПК БАЗА ♠`,
              url: '/profile',
              icon: '/icons/192.png',
            },
            { keyName, keyValue }
          );

          if (res.success) {
            sent++;
            details.push({ nick, success: true });
          } else {
            failed++;
            if (res.cleanedUp) cleaned++;
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
    }

    console.log('📊 Push Test Executed:', JSON.stringify({ total: details.length, sent, failed, cleaned, details }));

    return NextResponse.json({
      success: true,
      total: details.length,
      sent,
      failed,
      cleaned,
      details,
    });
  } catch (error: any) {
    console.error('Push test API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
