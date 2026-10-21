import { NextRequest, NextResponse } from 'next/server';
import { checkBountyAwards } from '@/lib/notifications';
import { verifyCronSecret } from '@/lib/cronAuth';

export async function GET(req: NextRequest) {
  console.log('[cron] fired at', new Date().toISOString());
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkBountyAwards();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error checkBountyAwards:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
