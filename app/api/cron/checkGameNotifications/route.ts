import { NextRequest, NextResponse } from 'next/server';
import { checkGameNotifications } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const secretParam = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const isSecretValid =
    Boolean(cronSecret) &&
    (secretParam === cronSecret || authHeader === `Bearer ${cronSecret}`);

  if (!isSecretValid) {
    console.warn(`[cron/checkGameNotifications] Unauthorized attempt (provided secret: ${secretParam ? 'param' : 'none'}, authHeader: ${authHeader ? 'present' : 'none'})`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isDebug =
    req.nextUrl.searchParams.get('debug') === '1' &&
    process.env.DEBUG_CRON === 'true';

  try {
    const result = await checkGameNotifications({ debug: isDebug });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error checkGameNotifications:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
