import { NextRequest, NextResponse } from 'next/server';
import { readSheet, readSheetRawDisplayValues, updateCell, normalizeName } from '@/lib/googleSheets';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { broadcastWebPush } from '@/lib/webPush';
import { buildPlayerIdentityMap, resolvePlayerIdentity } from '@/lib/calculations';

export const maxDuration = 60;

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

    // 1. Look up recipient in 'Игроки' using identity map
    let canonicalRecipientNick = cleanRecipient;
    let recipientPlayer: any = null;
    let targetIdentifiers: string[] = [cleanRecipient];
    try {
      const players = await readSheet('Игроки');
      const identityMap = buildPlayerIdentityMap(players);
      const recipientIdentity = resolvePlayerIdentity(cleanRecipient, identityMap);
      canonicalRecipientNick = recipientIdentity.canonicalNick || cleanRecipient;
      targetIdentifiers = Array.from(recipientIdentity.allKeys);

      recipientPlayer = players.find((p) => {
        const pNick = String(p['Ник'] || '').trim().toLowerCase();
        const pEmail = String(p['Email'] || '').trim().toLowerCase();
        const pUserId = String(p['User ID'] || '').trim().toLowerCase();
        return (
          (pNick && recipientIdentity.allKeys.has(pNick)) ||
          (pEmail && recipientIdentity.allKeys.has(pEmail)) ||
          (pUserId && recipientIdentity.allKeys.has(pUserId))
        );
      });
    } catch (err) {
      console.error('Failed to read Players sheet in chat notify:', err);
    }

    // 2. Send Web Push using target identifiers (nick, email, userId)
    try {
      const pushRes = await broadcastWebPush({
        title: `💬 Сообщение от ${cleanSender}`,
        body: text,
        url: '/chat',
        playerNicks: targetIdentifiers,
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

    // 4. Update column H ("Уведомление", positional column 8) in sheet 'Чаты' from "Да" to "✓" upon successful delivery
    let updatedCount = 0;
    if (notificationSent) {
      try {
        const rawRows = await readSheetRawDisplayValues('Чаты');
        if (rawRows && rawRows.length > 0) {
          const headers = rawRows[0].map((h) => String(h || '').trim());

          // Find Column C index (recipient) - default index 2 (0-based)
          let recipientColIndex = headers.findIndex(
            (h) => normalizeName(h) === 'получатель' || normalizeName(h) === 'кому?'
          );
          if (recipientColIndex === -1) recipientColIndex = 2; // Column C

          // Find Column A index (sender) - default index 0 (0-based)
          let senderColIndex = headers.findIndex(
            (h) => normalizeName(h) === 'отправитель' || normalizeName(h) === 'от кого?' || normalizeName(h) === 'игрок'
          );
          if (senderColIndex === -1) senderColIndex = 0; // Column A

          // Search from bottom up for matching pending rows
          for (let i = rawRows.length - 1; i >= 1; i--) {
            const row = rawRows[i];
            const rRecipient = String(row[recipientColIndex] || '').trim().toLowerCase();
            const rSender = String(row[senderColIndex] || '').trim().toLowerCase();
            const rNotify = String(row[7] || row[headers.findIndex((h) => normalizeName(h).includes('уведомлен'))] || '').trim().toLowerCase();

            const isRecipientMatch = rRecipient === cleanRecipient.toLowerCase();
            const isSenderMatch = !cleanSender || rSender === cleanSender.toLowerCase();
            const isPending = rNotify === 'да' || rNotify === 'da' || rNotify === 'yes' || rNotify === '';

            if (isRecipientMatch && isSenderMatch && isPending) {
              const sheetRowIndex = i + 1; // 1-based row index
              const colNumber = 8; // Positional Column H = 8
              const updated = await updateCell('Чаты', sheetRowIndex, colNumber, '✓');
              if (updated) updatedCount++;
            }
          }
        }
      } catch (updateErr) {
        console.error('Failed to update notification flag in Chats sheet:', updateErr);
      }
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
