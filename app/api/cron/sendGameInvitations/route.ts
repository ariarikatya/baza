import { NextRequest, NextResponse } from 'next/server';
import { sendGameInvitations } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  const cronSecret = process.env.CRON_SECRET;
  const secretParam = req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const isSecretValid =
    Boolean(cronSecret) &&
    (secretParam === cronSecret || authHeader === `Bearer ${cronSecret}`);

  if (!isSecretValid) {
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
