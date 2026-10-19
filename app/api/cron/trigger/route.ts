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

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}

async function handleTrigger(req: NextRequest) {
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

  // Direct execution of cron tasks (as primary execution or fallback when GitHub token is omitted/fails)
  let directResults: Record<string, any> = {};
  try {
    const [
      generalRes,
      gameRes,
      tournamentRes,
      absentRes,
      bountyRes,
      invitationRes,
      announcementRes,
    ] = await Promise.all([
      checkGeneralNotifications(),
      checkGameNotifications(),
      checkAndCompleteTournaments(),
      notifyAbsentPlayers(),
      checkBountyAwards(),
      sendGameInvitations(),
      checkNewGameAnnouncements(),
    ]);

    directResults = {
      checkGeneralNotifications: generalRes,
      checkGameNotifications: gameRes,
      checkAndCompleteTournaments: tournamentRes,
      notifyAbsentPlayers: absentRes,
      checkBountyAwards: bountyRes,
      sendGameInvitations: invitationRes,
      checkNewGameAnnouncements: announcementRes,
    };
  } catch (err: any) {
    console.error('❌ Error executing direct cron functions:', err);
    directResults = { error: err.message || String(err) };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    dispatchedGithub,
    githubError,
    directExecution: true,
    results: directResults,
  });
}
