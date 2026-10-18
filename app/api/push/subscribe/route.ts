import { NextRequest, NextResponse } from 'next/server';
import { readSheet, updateRow } from '@/lib/googleSheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, nick, subscription, action } = body;

    if (!userId && !nick) {
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

    if (action === 'unsubscribe') {
      await updateRow('Игроки', searchKey, searchValue, {
        'Веб-уведомления': 'Запрещено',
        'Push Subscription': '',
      });
      return NextResponse.json({ success: true, status: 'unsubscribed' });
    } else {
      await updateRow('Игроки', searchKey, searchValue, {
        'Веб-уведомления': 'Разрешено',
        'Push Subscription': JSON.stringify(subscription),
      });
      return NextResponse.json({ success: true, status: 'subscribed' });
    }
  } catch (error: any) {
    console.error('Push subscribe API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
