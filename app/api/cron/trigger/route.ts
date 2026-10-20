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

  const dispatchToken = process.env.GITHUB_DISPATCH_TOKEN || process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || 'ariarikatya/baza-pink';

  let dispatchedGithub = false;
  let githubError: string | null = null;

  if (dispatchToken) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${repository}/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dispatchToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Baza-Cron-Trigger',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event_type: 'run-crons' }),
      });

      if (ghRes.ok || ghRes.status === 204) {
        dispatchedGithub = true;
      } else {
        const ghErrText = await ghRes.text();
        githubError = `GitHub API status ${ghRes.status}: ${ghErrText}`;
        console.warn('⚠️ GitHub repository_dispatch failed:', githubError);
      }
    } catch (err: any) {
      githubError = err.message || String(err);
      console.error('❌ Error calling GitHub repository_dispatch API:', err);
    }
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
    dispatchedGithub,
    githubError,
    directExecution: true,
    results: directResults,
  });
}
