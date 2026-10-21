import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getLastPushError, getLastCronPing, getLastPushStats, getRecentPushEvents } from '@/lib/pushDiagnosticsStore';
import { isPushAllowed, checkVapidKeyPairMatch, parseSubscriptionsArray, getPushSubscriptionRaw, getWebPushFlagRaw } from '@/lib/webPush';
import { verifyCronSecret } from '@/lib/cronAuth';
import { isClubAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const isCronAuthorized = verifyCronSecret(req);
    const token = req.cookies.get('baza_token')?.value;
    let isUserAuthorized = false;
    if (token) {
      try {
        const players = await readSheet('Игроки');
        const cleanToken = token.trim().toLowerCase();

        const userObj = players.find((p) => {
          const pUserId = String(p['User ID'] || '').trim().toLowerCase();
          const pRowId = String(p['🔒 Row ID'] || '').trim().toLowerCase();
          const pNick = String(p['Ник'] || '').trim().toLowerCase();
          const pEmail = String(p['Email'] || '').trim().toLowerCase();

          return (
            (pUserId && pUserId === cleanToken) ||
            (pRowId && pRowId === cleanToken) ||
            (pNick && pNick === cleanToken) ||
            (pEmail && pEmail === cleanToken)
          );
        });

        if (isClubAdmin(userObj)) isUserAuthorized = true;
      } catch (e) {}
    }

    if (!isCronAuthorized && !isUserAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized: CRON_SECRET or Admin session required' }, { status: 401 });
    }
    const vapidPublic = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const vapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY);
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@baza.ru';
    const cronSecretSet = Boolean(process.env.CRON_SECRET);

    let totalPlayers = 0;
    let playersWithPushSub = 0;
    let playersAllowedPush = 0;
    let invalidSubscriptionJsonCount = 0;
    const endpointPrefixesSet = new Set<string>();
    const playerDiagnosticsList: Array<{
      nick: string;
      email: string;
      hasPushSubscription: boolean;
      webNotificationsFlag: string;
      isPushAllowed: boolean;
      subCount: number;
      lastPushStatus?: any;
    }> = [];

    try {
      const players = await readSheet('Игроки');
      totalPlayers = players.length;

      players.forEach((p) => {
        const nick = String(p['Ник'] || '').trim();
        const email = String(p['Email'] || '').trim();
        const flag = getWebPushFlagRaw(p);
        const subRaw = getPushSubscriptionRaw(p);

        let hasSub = false;
        let subCount = 0;

        if (subRaw && subRaw !== '') {
          playersWithPushSub++;
          const subs = parseSubscriptionsArray(subRaw);
          subCount = subs.length;
          hasSub = subCount > 0;
          if (subCount === 0) {
            invalidSubscriptionJsonCount++;
          } else {
            subs.forEach((s) => {
              if (s?.endpoint) {
                endpointPrefixesSet.add(String(s.endpoint).slice(0, 25));
              }
            });
          }
        }

        const allowed = isPushAllowed(p);
        if (allowed) {
          playersAllowedPush++;
        }

        playerDiagnosticsList.push({
          nick,
          email,
          hasPushSubscription: hasSub,
          webNotificationsFlag: flag,
          isPushAllowed: allowed,
          subCount,
          lastPushStatus: getLastPushStats(),
        });
      });
    } catch (e: any) {
      console.error('Diagnostics player sheet error:', e);
    }

    const { searchParams } = new URL(req.url);
    const eventParam = searchParams.get('event');
    const targetNickParam = searchParams.get('targetNick');

    let dryRunResult: any = null;
    if (eventParam || searchParams.get('dryRun') === '1') {
      const players = await readSheet('Игроки');
      const targetNicks = targetNickParam ? new Set([targetNickParam.trim().toLowerCase()]) : null;

      let eligibleSubscribers = 0;
      const skipReasons: string[] = [];

      players.forEach((p) => {
        const nick = String(p['Ник'] || '').trim();
        if (targetNicks && !targetNicks.has(nick.toLowerCase())) {
          return;
        }

        const flag = getWebPushFlagRaw(p).toLowerCase();
        const subRaw = getPushSubscriptionRaw(p);

        if (['запрещено', 'denied', 'false', '0', 'нет', 'off', 'disabled'].includes(flag)) {
          skipReasons.push(`Player "${nick}": explicitly disabled notifications (flag="${flag}")`);
        } else if (!subRaw || subRaw === '') {
          skipReasons.push(`Player "${nick}": missing subscription in "Веб-уведомления"`);
        } else {
          const subs = parseSubscriptionsArray(subRaw);
          if (subs.length > 0) {
            eligibleSubscribers += subs.length;
          } else {
            skipReasons.push(`Player "${nick}": no valid sub payload in "Веб-уведомления"`);
          }
        }
      });

      dryRunResult = {
        event: eventParam || 'dry-run',
        targetNick: targetNickParam || 'all',
        eligibleSubscribers,
        skipReasonsCount: skipReasons.length,
        skipReasonsSample: skipReasons.slice(0, 10),
      };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      vapidConfigured: vapidPublic && vapidPrivate,
      vapidKeyPairMatch: checkVapidKeyPairMatch(),
      vapidDetails: {
        hasPublicKey: vapidPublic,
        hasPrivateKey: vapidPrivate,
        subject: vapidSubject,
        keyPairMatch: checkVapidKeyPairMatch(),
      },
      cronSecretConfigured: cronSecretSet,
      stats: {
        totalPlayers,
        playersWithPushSub,
        playersAllowedPush,
        invalidSubscriptionJsonCount,
        endpointPrefixes: Array.from(endpointPrefixesSet),
      },
      players: playerDiagnosticsList,
      dryRun: dryRunResult,
      lastPushError: getLastPushError(),
      lastCronPing: getLastCronPing(),
      lastPushStats: getLastPushStats(),
      recentPushEvents: getRecentPushEvents(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
