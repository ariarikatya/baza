import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRow, invalidateSheetCache } from '@/lib/googleSheets';
import { buildPlayerIdentityMap, resolvePlayerIdentity } from '@/lib/calculations';
import { parseSubscriptionsArray, getWebPushFlagRaw } from '@/lib/webPush';

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

    const rawKeys = [
      String(userId || '').trim(),
      String(nick || '').trim(),
      String(rowId || '').trim(),
      String(email || '').trim(),
    ].filter(Boolean);

    if (rawKeys.length === 0) {
      return NextResponse.json({ success: false, error: 'Попробуйте ещё раз.' }, { status: 400 });
    }

    const searchKeys = new Set(rawKeys.map((k) => k.toLowerCase()));

    const findPlayerMatch = (playersList: any[]) => {
      const identityMap = buildPlayerIdentityMap(playersList);

      return playersList.find((p) => {
        const pUserId = String(p['User ID'] || '').trim().toLowerCase();
        const pRowId = String(p['🔒 Row ID'] || '').trim().toLowerCase();
        const pNick = String(p['Ник'] || '').trim().toLowerCase();
        const pEmail = String(p['Email'] || '').trim().toLowerCase();

        if (
          (pUserId && searchKeys.has(pUserId)) ||
          (pRowId && searchKeys.has(pRowId)) ||
          (pNick && searchKeys.has(pNick)) ||
          (pEmail && searchKeys.has(pEmail))
        ) {
          return true;
        }

        for (const k of Array.from(searchKeys)) {
          const resolved = resolvePlayerIdentity(k, identityMap);
          if (resolved && resolved.allKeys) {
            if (
              (pUserId && resolved.allKeys.has(pUserId)) ||
              (pRowId && resolved.allKeys.has(pRowId)) ||
              (pNick && resolved.allKeys.has(pNick)) ||
              (pEmail && resolved.allKeys.has(pEmail))
            ) {
              return true;
            }
          }
        }

        return false;
      });
    };

    let players = await readSheet('Игроки');
    let matchedPlayer = findPlayerMatch(players);

    if (!matchedPlayer) {
      console.warn(`⚠️ [push subscribe] Player not found on initial read for searchKeys: [${Array.from(searchKeys).join(', ')}]. Re-reading "Игроки" sheet...`);
      // Retry readSheet to bypass cache/lag
      players = await readSheet('Игроки');
      matchedPlayer = findPlayerMatch(players);
    }

    if (!matchedPlayer) {
      console.error(`❌ [push subscribe] Player not found in "Игроки" after re-read for identifiers: [${Array.from(searchKeys).join(', ')}]`);
      return NextResponse.json(
        {
          success: false,
          error: 'Попробуйте ещё раз.',
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
      });
      invalidateSheetCache('Игроки');
      return NextResponse.json({ success: true, status: 'unsubscribed' });
    } else {
      const currentFlagStr = getWebPushFlagRaw(matchedPlayer);
      let existingSubs: any[] = parseSubscriptionsArray(currentFlagStr);

      const newEndpoint = subscription?.endpoint;
      if (newEndpoint) {
        existingSubs = existingSubs.filter((s) => s?.endpoint !== newEndpoint);
        existingSubs.push(subscription);
      } else if (subscription) {
        existingSubs = [subscription];
      }

      const payloadJson = existingSubs.length === 0
        ? ''
        : JSON.stringify(existingSubs.length === 1 ? existingSubs[0] : existingSubs);

      const updatedWebPushValue = payloadJson
        ? `Разрешено | ${payloadJson}`
        : 'Разрешено';

      await updateRow('Игроки', searchKey, searchValue, {
        'Веб-уведомления': updatedWebPushValue,
      });
      invalidateSheetCache('Игроки');

      return NextResponse.json({ success: true, status: 'subscribed' });
    }
  } catch (error: any) {
    console.error('Push subscribe API error:', error);
    return NextResponse.json({ success: false, error: 'Попробуйте ещё раз.' }, { status: 500 });
  }
}
