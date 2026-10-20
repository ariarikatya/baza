import { NextRequest, NextResponse } from 'next/server';
import {
  checkGeneralNotifications,
  checkGameNotifications,
  checkAndCompleteTournaments,
  notifyAbsentPlayers,
  checkBountyAwards,
  sendGameInvitations,
  checkNewGameAnnouncements,
} from '@/lib/notifications';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}

async function handleTrigger(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('Authorization');
  const url = new URL(req.url);
  const paramSecret = url.searchParams.get('secret');

  const providedSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : paramSecret?.trim();

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  // Direct execution of cron tasks (primary execution path)
  // Execute sequentially to prevent rate limits and race conditions on Google Sheets
  const directResults: Record<string, any> = {};
  const runTask = async (name: string, fn: () => Promise<any>) => {
    try {
      directResults[name] = await fn();
    } catch (err: any) {
      console.error(`❌ Error executing cron task "${name}":`, err);
      directResults[name] = { error: err.message || String(err) };
    }
  };

  await runTask('checkGeneralNotifications', checkGeneralNotifications);
  await runTask('checkGameNotifications', checkGameNotifications);
  await runTask('checkAndCompleteTournaments', checkAndCompleteTournaments);
  await runTask('notifyAbsentPlayers', notifyAbsentPlayers);
  await runTask('checkBountyAwards', checkBountyAwards);
  await runTask('sendGameInvitations', sendGameInvitations);
  await runTask('checkNewGameAnnouncements', checkNewGameAnnouncements);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    directExecution: true,
    results: directResults,
  });
}
