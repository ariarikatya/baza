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
      lastPushError: getLastPushError(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
