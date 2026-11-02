import { NextRequest, NextResponse } from 'next/server';
import { checkNewGames } from '@/lib/notifications';
import { verifyCronSecret } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  console.log('[cron/checkNewGames] fired at', new Date().toISOString());
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkNewGames();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error checkNewGames:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
