import { NextRequest, NextResponse } from 'next/server';
import { recordCronPing } from '@/lib/pushDiagnosticsStore';
import { verifyCronSecret } from '@/lib/cronAuth';
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
  const shortId = Math.random().toString(36).substring(2, 8);
  const reqIp = req.headers.get('x-forwarded-for') || undefined;
  recordCronPing(shortId, reqIp);

  console.log(`[cron] fired at ${new Date().toISOString()} (shortId=${shortId})`);
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const requestedTask = url.searchParams.get('task')?.trim();

  const allTasks: Record<string, () => Promise<any>> = {
    checkGeneralNotifications,
    checkGameNotifications,
    checkAndCompleteTournaments,
    notifyAbsentPlayers,
    checkBountyAwards,
    sendGameInvitations,
    checkNewGameAnnouncements,
  };

  const directResults: Record<string, any> = {};
  const runTask = async (name: string, fn: () => Promise<any>) => {
    try {
      directResults[name] = await fn();
    } catch (err: any) {
      console.error(`❌ Error executing cron task "${name}":`, err);
      directResults[name] = { error: err.message || String(err) };
    }
  };

  if (requestedTask && allTasks[requestedTask]) {
    await runTask(requestedTask, allTasks[requestedTask]);
  } else {
    await runTask('checkGeneralNotifications', checkGeneralNotifications);
    await runTask('checkGameNotifications', checkGameNotifications);
    await runTask('checkAndCompleteTournaments', checkAndCompleteTournaments);
    await runTask('notifyAbsentPlayers', notifyAbsentPlayers);
    await runTask('checkBountyAwards', checkBountyAwards);
    await runTask('sendGameInvitations', sendGameInvitations);
    await runTask('checkNewGameAnnouncements', checkNewGameAnnouncements);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    directExecution: true,
    results: directResults,
  });
}
