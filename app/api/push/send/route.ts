import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';
import { sendWebPushNotification, isPushAllowed, toAbsoluteUrl } from '@/lib/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, text, body: messageBody, url, icon, badge } = body;

    const players = await readSheet('Игроки');
    let sentCount = 0;

    const { broadcastWebPush } = await import('@/lib/webPush');
    const result = await broadcastWebPush({
      title: title || 'Покерный клуб БАЗА',
      body: messageBody || text || '',
      url: url || '/',
      icon,
      badge,
      eventName: 'general',
    });
    sentCount = result.sent;

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Push send API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
