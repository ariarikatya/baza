import { NextRequest, NextResponse } from 'next/server';
import { checkBountyAwards } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const secretParam = req.nextUrl.searchParams.get('secret');
    const authHeader = req.headers.get('authorization');
    if (secretParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await checkBountyAwards();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron error checkBountyAwards:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Internal error' }, { status: 500 });
  }
}
