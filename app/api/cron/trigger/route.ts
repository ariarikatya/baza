import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}

async function handleTrigger(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secretParam = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const isSecretValid =
    Boolean(cronSecret) &&
    (secretParam === cronSecret || authHeader === `Bearer ${cronSecret}`);

  if (!isSecretValid) {
    console.warn(`[cron/trigger] Unauthorized trigger attempt`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dispatchToken = process.env.GITHUB_DISPATCH_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER || 'ariarikatya';
  const repoName = process.env.GITHUB_REPO_NAME || 'baza-pink';

  if (dispatchToken) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dispatchToken}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'baza-cron-trigger',
          },
          body: JSON.stringify({
            event_type: 'run-crons',
          }),
        }
      );

      if (response.ok || response.status === 204) {
        return NextResponse.json({
          success: true,
          method: 'repository_dispatch',
          message: 'GitHub repository_dispatch event (run-crons) dispatched successfully.',
        });
      } else {
        const errorText = await response.text();
        console.error(`GitHub dispatch failed: status ${response.status}, body: ${errorText}`);
      }
    } catch (err: any) {
      console.error('Error sending repository_dispatch to GitHub:', err);
    }
  }

  // Fallback: direct trigger of internal cron endpoints if GITHUB_DISPATCH_TOKEN is missing or API failed
  const baseUrl = process.env.NOTIFICATIONS_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://baza-pink.vercel.app';
  const endpoints = [
    'checkGeneralNotifications',
    'checkGameNotifications',
    'checkAndCompleteTournaments',
    'notifyAbsentPlayers',
    'checkBountyAwards',
    'sendGameInvitations',
    'checkNewGameAnnouncements',
  ];

  const results: Record<string, any> = {};

  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}/api/cron/${endpoint}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
      results[endpoint] = { status: res.status, ok: res.ok };
    } catch (e: any) {
      results[endpoint] = { error: e?.message || 'Failed' };
    }
  }

  return NextResponse.json({
    success: true,
    method: 'direct_execution',
    message: 'Executed cron endpoints directly.',
    results,
  });
}
