import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, message, recipientNick, recipientEmail, chatText, senderNick } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const success = await sendTelegramNotification(userId || 'system', message);

    if (recipientNick && chatText) {
      try {
        const { broadcastWebPush } = await import('@/lib/webPush');
        const targetNicks = [recipientNick];
        if (recipientEmail && !recipientEmail.includes('@')) {
          targetNicks.push(recipientEmail);
        }
        await broadcastWebPush({
          title: `💬 Сообщение от ${senderNick || 'игрока'}`,
          body: chatText,
          url: '/chat',
          playerNicks: targetNicks,
        });
      } catch (pushErr) {
        console.error('Failed to send chat web push notification:', pushErr);
      }
    }

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
