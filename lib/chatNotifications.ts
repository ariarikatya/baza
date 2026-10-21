import { readSheet, readSheetRawDisplayValues, updateCell, normalizeName } from '@/lib/googleSheets';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { broadcastWebPush } from '@/lib/webPush';
import { buildPlayerIdentityMap, resolvePlayerIdentity } from '@/lib/calculations';

export async function processPendingChatNotifications(): Promise<{
  processed: number;
  sentWebPush: number;
  sentTelegram: number;
}> {
  let processed = 0;
  let sentWebPush = 0;
  let sentTelegram = 0;

  try {
    const rawRows = await readSheetRawDisplayValues('Чаты');
    if (!rawRows || rawRows.length < 2) {
      return { processed: 0, sentWebPush: 0, sentTelegram: 0 };
    }

    const players = await readSheet('Игроки');
    const identityMap = buildPlayerIdentityMap(players);

    // Header index determination
    const headers = rawRows[0].map((h) => String(h || '').trim());
    let recipientColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'получатель' || normalizeName(h) === 'кому?'
    );
    if (recipientColIndex === -1) recipientColIndex = 2; // Column C

    let senderColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'отправитель' || normalizeName(h) === 'от кого?' || normalizeName(h) === 'игрок'
    );
    if (senderColIndex === -1) senderColIndex = 0; // Column A

    let messageColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'сообщение' || normalizeName(h) === 'текст'
    );
    if (messageColIndex === -1) messageColIndex = 1; // Column B

    let notifyColIndex = 7; // Column H (0-based 7)

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const notifyVal = String(row[notifyColIndex] || '').trim().toLowerCase();

      const isPending = notifyVal === 'да' || notifyVal === 'da' || notifyVal === 'yes';
      if (!isPending) continue;

      processed++;

      const recipientRaw = String(row[recipientColIndex] || '').trim();
      const senderRaw = String(row[senderColIndex] || 'Игрок').trim();
      const text = String(row[messageColIndex] || '').trim();

      if (!recipientRaw) continue;

      const recipientIdentity = resolvePlayerIdentity(recipientRaw, identityMap);
      const targetIdentifiers = Array.from(recipientIdentity.allKeys);

      const recipientPlayer = players.find((p) => {
        const pNick = String(p['Ник'] || '').trim().toLowerCase();
        const pEmail = String(p['Email'] || '').trim().toLowerCase();
        const pUserId = String(p['User ID'] || '').trim().toLowerCase();
        return (
          (pNick && recipientIdentity.allKeys.has(pNick)) ||
          (pEmail && recipientIdentity.allKeys.has(pEmail)) ||
          (pUserId && recipientIdentity.allKeys.has(pUserId))
        );
      });

      let pushSent = false;
      let tgSent = false;

      // 1. Web Push
      try {
        const pushRes = await broadcastWebPush({
          title: `💬 Сообщение от ${senderRaw}`,
          body: text || 'Новое сообщение в чате',
          url: '/chat',
          playerNicks: targetIdentifiers,
        });
        if (pushRes.sent > 0) {
          pushSent = true;
          sentWebPush++;
        }
      } catch (err) {
        console.error('Chat cron Web Push error:', err);
      }

      // 2. Telegram
      const tgId = recipientPlayer?.['Telegram ID'];
      if (tgId && String(tgId).trim() !== '') {
        try {
          const tgOk = await sendTelegramMessage(
            String(tgId).trim(),
            `💬 *Новое сообщение от ${senderRaw}*:\n\n${text}`
          );
          if (tgOk) {
            tgSent = true;
            sentTelegram++;
          }
        } catch (err) {
          console.error('Chat cron Telegram error:', err);
        }
      }

      // Propose completion flag update if either Web Push or Telegram succeeded
      if (pushSent || tgSent) {
        const sheetRowIndex = i + 1; // 1-based index
        await updateCell('Чаты', sheetRowIndex, 8, '✓'); // Column H = 8
      }
    }
  } catch (err) {
    console.error('Error processing pending chat notifications:', err);
  }

  return { processed, sentWebPush, sentTelegram };
}
