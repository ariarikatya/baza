import { NextRequest, NextResponse } from 'next/server';
import { sendGameInvitations } from '@/lib/notifications';
import { verifyCronSecret } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const debugParam = req.nextUrl.searchParams.get('debug') === 'true';

  try {
    const result = await sendGameInvitations({ debug: debugParam });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error sendGameInvitations:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
