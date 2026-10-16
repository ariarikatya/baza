import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate, getWebhookInfo } from '@/lib/telegramBot';

export async function GET(request: NextRequest) {
  try {
    const secretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;
    if (secretToken && secretToken.trim() !== '') {
      const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== secretToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const info = await getWebhookInfo();
    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get webhook info' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const secretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;
    if (secretToken && secretToken.trim() !== '') {
      const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== secretToken) {
        console.warn('Unauthorized telegram webhook request: secret token mismatch');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const update = await request.json();
    console.log('📥 Telegram Webhook Update:', JSON.stringify(update));

    const update_type = update.message
      ? 'message'
      : update.callback_query
      ? 'callback_query'
      : update.my_chat_member
      ? 'my_chat_member'
      : update.chat_member
      ? 'chat_member'
      : 'unknown';

    const from_id = update.message?.from?.id ?? update.callback_query?.from?.id ?? update.my_chat_member?.from?.id ?? update.chat_member?.from?.id ?? null;
    const chat_id = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id ?? from_id;
    const message_text = update.message?.text ?? update.callback_query?.data ?? null;
    const message_entities = update.message?.entities ?? null;

    console.log(`📊 Telegram Update Parsed: type=${update_type}, from=${from_id}, chat=${chat_id}, text=${message_text}, entities=${JSON.stringify(message_entities)}`);

    const result = await processTelegramUpdate(update);

    console.log(
      'Telegram update processed:',
      JSON.stringify({
        update_id: update.update_id,
        update_type,
        from_id,
        chat_id,
        textPreview: message_text?.slice(0, 30),
        branch: result.branch,
        handled: result.handled,
      })
    );

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    console.error('Error in Telegram Webhook Handler:', err);
    // Always return 200 OK so Telegram does not retry indefinitely
    return NextResponse.json({ ok: true, error: err?.message || 'Error processed' }, { status: 200 });
  }
}
