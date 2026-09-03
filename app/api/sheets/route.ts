import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeRow, updateRow, deleteRow } from '@/lib/googleSheets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetName = searchParams.get('sheet');

    if (!sheetName) {
      return NextResponse.json({ error: 'Sheet name required' }, { status: 400 });
    }

    const data = await readSheet(sheetName);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetName, action, rowData, keyName, keyValue } = body;

    if (!sheetName) {
      return NextResponse.json({ error: 'Sheet name required' }, { status: 400 });
    }

    if (action === 'append' || action === 'write') {
      const success = await writeRow(sheetName, rowData);
      return NextResponse.json({ success });
    }

    if (action === 'update') {
      const searchKey = keyName || 'Ник';
      const success = await updateRow(sheetName, searchKey, keyValue, rowData);
      return NextResponse.json({ success });
    }

    if (action === 'delete') {
      const searchKey = keyName || 'Ник'; // Добавляем ключ по умолчанию
      const success = await deleteRow(sheetName, searchKey, keyValue);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
