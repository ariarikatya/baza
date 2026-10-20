import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { getLastPushError } from '@/lib/pushDiagnosticsStore';

export async function GET(req: NextRequest) {
  try {
    const vapidPublic = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    const vapidPrivate = Boolean(process.env.VAPID_PRIVATE_KEY);
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@baza.ru';
    const cronSecretSet = Boolean(process.env.CRON_SECRET);

    let totalPlayers = 0;
    let playersWithPushSub = 0;
    let playersAllowedPush = 0;

    try {
      const players = await readSheet('Игроки');
      totalPlayers = players.length;

      players.forEach((p) => {
        const sub = p['Push Subscription'];
        const flag = String(p['Веб-уведомления'] || '').trim().toLowerCase();

        if (sub && sub.trim() !== '') {
          playersWithPushSub++;
        }
        if (!['запрещено', 'denied', 'false', '0', 'нет'].includes(flag) && sub && sub.trim() !== '') {
          playersAllowedPush++;
        }
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

        const flag = String(p['Веб-уведомления'] || '').trim().toLowerCase();
        const sub = p['Push Subscription'];

        if (['запрещено', 'denied', 'false', '0', 'нет'].includes(flag)) {
          skipReasons.push(`Player "${nick}": explicitly disabled notifications (flag="${flag}")`);
        } else if (!sub || sub.trim() === '') {
          skipReasons.push(`Player "${nick}": missing Push Subscription`);
        } else {
          try {
            const parsed = JSON.parse(sub);
            const count = Array.isArray(parsed) ? parsed.length : 1;
            eligibleSubscribers += count;
          } catch (err) {
            skipReasons.push(`Player "${nick}": invalid JSON in Push Subscription`);
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
      vapidDetails: {
        hasPublicKey: vapidPublic,
        hasPrivateKey: vapidPrivate,
        subject: vapidSubject,
      },
      cronSecretConfigured: cronSecretSet,
      stats: {
        totalPlayers,
        playersWithPushSub,
        playersAllowedPush,
      },
      dryRun: dryRunResult,
      lastPushError: getLastPushError(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
