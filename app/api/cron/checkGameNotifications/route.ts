import { NextRequest, NextResponse } from 'next/server';
import { checkGameNotifications } from '@/lib/notifications';
import { verifyCronSecret } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  if (!verifyCronSecret(req)) {
    console.warn('[cron/checkGameNotifications] Unauthorized attempt');
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
