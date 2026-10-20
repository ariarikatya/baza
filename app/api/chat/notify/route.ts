import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateCell } from '@/lib/googleSheets';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { broadcastWebPush } from '@/lib/webPush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { recipientNick, senderNick, text } = body;

    if (!recipientNick || !text) {
      return NextResponse.json({ success: false, error: 'recipientNick and text are required' }, { status: 400 });
    }

    const cleanRecipient = String(recipientNick).trim();
    const cleanSender = String(senderNick || 'Игрок').trim();
    let notificationSent = false;

    // 1. Look up recipient in 'Игроки'
    let recipientPlayer: any = null;
    try {
      const players = await readSheet('Игроки');
      recipientPlayer = players.find(
        (p) => String(p['Ник'] || '').trim().toLowerCase() === cleanRecipient.toLowerCase()
      );
    } catch (err) {
      console.error('Failed to read Players sheet in chat notify:', err);
    }

    // 2. Send Web Push
    try {
      const pushRes = await broadcastWebPush({
        title: `💬 Сообщение от ${cleanSender}`,
        body: text,
        url: '/chat',
        playerNicks: [cleanRecipient],
      });
      if (pushRes.sent > 0) {
        notificationSent = true;
      }
    } catch (pushErr) {
      console.error('Web Push notify error in chat:', pushErr);
    }

    // 3. Send Telegram Notification
    const tgId = recipientPlayer?.['Telegram ID'];
    if (tgId && String(tgId).trim() !== '') {
      try {
        const tgOk = await sendTelegramMessage(
          String(tgId).trim(),
          `💬 *Новое сообщение от ${cleanSender}*:\n\n${text}`
        );
        if (tgOk) {
          notificationSent = true;
        }
      } catch (tgErr) {
        console.error('Telegram notify error in chat:', tgErr);
      }
    }

    // 4. Update column H ("Уведомление") in sheet 'Чаты' from "Да" to "✓"
    let updatedCount = 0;
    try {
      const chatRows = await readSheet('Чаты');
      for (let i = 0; i < chatRows.length; i++) {
        const row = chatRows[i];
        const rRecipient = String(row['Получатель'] || row['Игрок'] || '').trim().toLowerCase();
        const rNotify = String(row['Уведомление'] || '').trim().toLowerCase();

        if (rRecipient === cleanRecipient.toLowerCase() && (rNotify === 'да' || rNotify === 'da' || rNotify === 'yes')) {
          // Row index in sheet is i + 2 (1-based index including header row A1)
          const sheetRowIndex = i + 2;
          // Column H is column 8
          const updated = await updateCell('Чаты', sheetRowIndex, 8, '✓');
          if (updated) updatedCount++;
        }
      }
    } catch (updateErr) {
      console.error('Failed to update notification flag in Chats sheet:', updateErr);
    }

    return NextResponse.json({
      success: true,
      notificationSent,
      updatedCount,
    });
  } catch (error: any) {
    console.error('Chat notify API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
