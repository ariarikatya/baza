import { NextRequest, NextResponse } from 'next/server';
import { checkGeneralNotifications } from '@/lib/notifications';
import { verifyCronSecret } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  if (!verifyCronSecret(req)) {
    console.warn('[cron/checkGeneralNotifications] Unauthorized attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isDebug =
    req.nextUrl.searchParams.get('debug') === '1' &&
    process.env.DEBUG_CRON === 'true';

  try {
    const result = await checkGeneralNotifications({ debug: isDebug });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error checkGeneralNotifications:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
