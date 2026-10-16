import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nick, userId } = body;

    if (!nick && !userId) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    const players = await readSheet('Игроки');
    const matchedPlayer = players.find((p) => {
      if (userId && String(p['User ID'] || '').trim() === String(userId).trim()) return true;
      if (nick && String(p['Ник'] || '').trim().toLowerCase() === String(nick).trim().toLowerCase()) return true;
      return false;
    });

    if (!matchedPlayer) {
      return NextResponse.json({ success: false, error: 'Player not found' }, { status: 404 });
    }

    const searchKey = matchedPlayer['🔒 Row ID']
      ? '🔒 Row ID'
      : matchedPlayer['User ID']
      ? 'User ID'
      : 'Ник';
    const searchValue = matchedPlayer[searchKey];

    // Unbind Telegram ID in sheet "Игроки"
    await updateRow('Игроки', searchKey, searchValue, {
      'Telegram ID': '',
    });

    // Sync unbind to sheet "В клубе"
    try {
      const inClubRows = await readSheet('В клубе');
      const targetNickNorm = String(matchedPlayer['Ник'] || '').trim().toLowerCase();
      const inClubMatch = inClubRows.find(
        (r) => String(r['Ник'] || '').trim().toLowerCase() === targetNickNorm
      );
      if (inClubMatch) {
        await updateRow('В клубе', 'Ник', inClubMatch['Ник'], {
          'Telegram ID': '',
        });
      }
    } catch (e) {
      console.error('Error unbinding Telegram ID in "В клубе":', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in telegram unsubscribe API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
