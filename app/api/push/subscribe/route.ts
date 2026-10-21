import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'VAPID ключи не настроены. Добавьте NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY и VAPID_SUBJECT в Vercel Environment Variables.',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { userId, nick, rowId, email, subscription, action } = body;

    const searchKeys = [
      String(userId || '').trim(),
      String(nick || '').trim(),
      String(rowId || '').trim(),
      String(email || '').trim(),
    ].filter(Boolean).map((k) => k.toLowerCase());

    if (searchKeys.length === 0) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    const players = await readSheet('Игроки');
    const matchedPlayer = players.find((p) => {
      const pUserId = String(p['User ID'] || '').trim().toLowerCase();
      const pRowId = String(p['🔒 Row ID'] || '').trim().toLowerCase();
      const pNick = String(p['Ник'] || '').trim().toLowerCase();
      const pEmail = String(p['Email'] || '').trim().toLowerCase();

      return searchKeys.some(
        (key) =>
          (pUserId && pUserId === key) ||
          (pRowId && pRowId === key) ||
          (pNick && pNick === key) ||
          (pEmail && pEmail === key)
      );
    });

    if (!matchedPlayer) {
      return NextResponse.json(
        {
          success: false,
          error: `Игрок не найден в списке "Игроки" по идентификаторам (${searchKeys.join(', ')})`,
        },
        { status: 404 }
      );
    }

    const searchKey = matchedPlayer['🔒 Row ID']
      ? '🔒 Row ID'
      : matchedPlayer['User ID']
      ? 'User ID'
      : 'Ник';
    const searchValue = matchedPlayer[searchKey];

    if (action === 'unsubscribe') {
      await updateRow('Игроки', searchKey, searchValue, {
        'Веб-уведомления': 'Запрещено',
        'Push Subscription': '',
      });
      return NextResponse.json({ success: true, status: 'unsubscribed' });
    } else {
      let existingSubs: any[] = [];
      if (matchedPlayer['Push Subscription']) {
        try {
          const parsed = JSON.parse(matchedPlayer['Push Subscription']);
          existingSubs = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {}
      }

      const newEndpoint = subscription?.endpoint;
      if (newEndpoint) {
        existingSubs = existingSubs.filter((s) => s?.endpoint !== newEndpoint);
        existingSubs.push(subscription);
      } else {
        existingSubs = [subscription];
      }

      const updatedSubValue = existingSubs.length === 1 ? JSON.stringify(existingSubs[0]) : JSON.stringify(existingSubs);

      // Unconditionally set 'Веб-уведомления' = 'Разрешено' when a push subscription is saved
      await updateRow('Игроки', searchKey, searchValue, {
        'Веб-уведомления': 'Разрешено',
        'Push Subscription': updatedSubValue,
      });
      return NextResponse.json({ success: true, status: 'subscribed' });
    }
  } catch (error: any) {
    console.error('Push subscribe API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
