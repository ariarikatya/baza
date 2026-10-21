import { NextRequest, NextResponse } from 'next/server';
import { readSheetRawDisplayValues, updateCell, normalizeName, readSheet } from '@/lib/googleSheets';
import { isMessageRead, buildPlayerIdentityMap, resolvePlayerIdentity } from '@/lib/calculations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userNick, userEmail, userId, partnerNick, partnerEmail } = body;

    if (!userNick && !userEmail && !userId) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }
    if (!partnerNick && !partnerEmail) {
      return NextResponse.json({ success: false, error: 'Partner identifier required' }, { status: 400 });
    }

    const rawRows = await readSheetRawDisplayValues('Чаты');
    if (!rawRows || rawRows.length < 2) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    const players = await readSheet('Игроки');
    const identityMap = buildPlayerIdentityMap(players);

    const currentUserIdentity = resolvePlayerIdentity(userNick || userEmail || userId, identityMap);
    const currentUserKeys = currentUserIdentity.allKeys;
    if (userNick) currentUserKeys.add(userNick.toLowerCase());
    if (userEmail) currentUserKeys.add(userEmail.toLowerCase());
    if (userId) currentUserKeys.add(userId.toLowerCase());

    const partnerIdentity = resolvePlayerIdentity(partnerNick || partnerEmail, identityMap);
    const partnerKeys = partnerIdentity.allKeys;
    if (partnerNick) partnerKeys.add(partnerNick.toLowerCase());
    if (partnerEmail) partnerKeys.add(partnerEmail.toLowerCase());

    const headers = rawRows[0].map((h) => String(h || '').trim());
    let senderColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'отправитель' || normalizeName(h) === 'от кого?' || normalizeName(h) === 'игрок'
    );
    if (senderColIndex === -1) senderColIndex = 0; // Column A

    let recipientColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'получатель' || normalizeName(h) === 'кому?'
    );
    if (recipientColIndex === -1) recipientColIndex = 2; // Column C

    let isReadColIndex = headers.findIndex(
      (h) => normalizeName(h) === 'прочитано' || normalizeName(h) === 'прочитано?'
    );
    if (isReadColIndex === -1) isReadColIndex = 8; // Column I (0-based 8)

    let updatedCount = 0;

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const senderVal = String(row[senderColIndex] || '').trim().toLowerCase();
      const recipientVal = String(row[recipientColIndex] || '').trim().toLowerCase();
      const isReadVal = row[isReadColIndex] !== undefined ? row[isReadColIndex] : '';

      // Check if message is from partner to current user
      const isFromPartner = partnerKeys.has(senderVal);
      const isToCurrentUser = recipientVal === 'всем' || currentUserKeys.has(recipientVal);

      if (isFromPartner && isToCurrentUser) {
        if (!isMessageRead(isReadVal)) {
          const sheetRowIndex = i + 1; // 1-based index
          const colNumber = isReadColIndex + 1; // 1-based col number (e.g., 9)
          const ok = await updateCell('Чаты', sheetRowIndex, colNumber, 'TRUE');
          if (ok) updatedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (err: any) {
    console.error('Error in /api/chat/read:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
