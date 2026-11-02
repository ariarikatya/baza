import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRow, invalidateSheetCache } from '@/lib/googleSheets';
import { buildPlayerIdentityMap, resolvePlayerIdentity } from '@/lib/calculations';
import { parseSubscriptionsArray, getWebPushFlagRaw, isPushAllowed } from '@/lib/webPush';

function findPlayerMatch(playersList: any[], rawKeys: string[]) {
  const searchKeys = new Set(rawKeys.filter(Boolean).map((k) => k.toLowerCase()));
  if (searchKeys.size === 0) return null;

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
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const nick = searchParams.get('nick') || '';
    const rowId = searchParams.get('rowId') || '';
    const email = searchParams.get('email') || '';
    const token = req.cookies.get('baza_token')?.value || '';

    const rawKeys = [
      String(userId || '').trim(),
      String(nick || '').trim(),
      String(rowId || '').trim(),
      String(email || '').trim(),
      String(token || '').trim(),
    ].filter(Boolean);

    const hasVapidKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

    if (rawKeys.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Идентификатор пользователя не указан',
        allowed: false,
        flag: '',
        hasVapidKey,
      }, { status: 400 });
    }

    let players = await readSheet('Игроки');
    let matchedPlayer = findPlayerMatch(players, rawKeys);

    if (!matchedPlayer) {
      // Invalidate and retry readSheet to bypass cache/lag
      invalidateSheetCache('Игроки');
      players = await readSheet('Игроки');
      matchedPlayer = findPlayerMatch(players, rawKeys);
    }

    if (!matchedPlayer) {
      return NextResponse.json({
        success: false,
        error: 'Игрок не найден',
        allowed: false,
        flag: '',
        hasVapidKey,
      }, { status: 404 });
    }

    const flag = getWebPushFlagRaw(matchedPlayer);
    const allowed = isPushAllowed(matchedPlayer);

    return NextResponse.json({
      success: true,
      allowed,
      flag,
      hasVapidKey,
      nick: matchedPlayer['Ник'] || '',
      userId: matchedPlayer['User ID'] || '',
    });
  } catch (error: any) {
    console.error('GET /api/push/status error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Ошибка сервера',
      allowed: false,
      flag: '',
      hasVapidKey: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, nick, rowId, email, status = 'Разрешено', subscription } = body;
    const token = req.cookies.get('baza_token')?.value || '';

    const rawKeys = [
      String(userId || '').trim(),
      String(nick || '').trim(),
      String(rowId || '').trim(),
      String(email || '').trim(),
      String(token || '').trim(),
    ].filter(Boolean);

    if (rawKeys.length === 0) {
      return NextResponse.json({ success: false, error: 'Попробуйте ещё раз.' }, { status: 400 });
    }

    let players = await readSheet('Игроки');
    let matchedPlayer = findPlayerMatch(players, rawKeys);

    if (!matchedPlayer) {
      invalidateSheetCache('Игроки');
      players = await readSheet('Игроки');
      matchedPlayer = findPlayerMatch(players, rawKeys);
    }

    if (!matchedPlayer) {
      return NextResponse.json({ success: false, error: 'Игрок не найден.' }, { status: 404 });
    }

    const searchKey = matchedPlayer['🔒 Row ID']
      ? '🔒 Row ID'
      : matchedPlayer['User ID']
      ? 'User ID'
      : 'Ник';
    const searchValue = matchedPlayer[searchKey];

    const targetStatus = String(status || 'Разрешено').trim();

    let updatedWebPushValue = targetStatus;
    if (subscription && typeof subscription === 'object') {
      const currentFlagStr = getWebPushFlagRaw(matchedPlayer);
      let existingSubs: any[] = parseSubscriptionsArray(currentFlagStr);
      const newEndpoint = subscription?.endpoint?.trim();

      if (newEndpoint) {
        existingSubs = existingSubs.filter((s) => s?.endpoint?.trim() !== newEndpoint);
        existingSubs.push(subscription);
      } else if (subscription.endpoint) {
        existingSubs = [subscription];
      }

      // Deduplicate by endpoint
      const seenEps = new Set<string>();
      const dedupedSubs: any[] = [];
      for (const s of existingSubs) {
        const ep = s?.endpoint?.trim();
        if (ep && !seenEps.has(ep)) {
          seenEps.add(ep);
          dedupedSubs.push(s);
        }
      }

      const payloadJson = dedupedSubs.length === 0
        ? ''
        : JSON.stringify(dedupedSubs.length === 1 ? dedupedSubs[0] : dedupedSubs);

      updatedWebPushValue = payloadJson ? `${targetStatus} | ${payloadJson}` : targetStatus;
    }

    await updateRow('Игроки', searchKey, searchValue, {
      'Веб-уведомления': updatedWebPushValue,
    });
    invalidateSheetCache('Игроки');

    return NextResponse.json({
      success: true,
      status: updatedWebPushValue,
      allowed: true,
    });
  } catch (error: any) {
    console.error('PATCH /api/push/status error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Ошибка сервера' }, { status: 500 });
  }
}
