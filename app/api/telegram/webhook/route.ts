import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegramBot';

export async function POST(request: NextRequest) {
  try {
    const secretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;
    if (secretToken) {
      const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== secretToken) {
        console.warn('Unauthorized telegram webhook request: secret token mismatch');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const update = await request.json();
    const result = await processTelegramUpdate(update);

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error('Error in Telegram Webhook Handler:', err);
    // Always return 200 OK so Telegram does not retry indefinitely
    return NextResponse.json({ ok: true, error: err?.message || 'Error processed' }, { status: 200 });
  }
}
