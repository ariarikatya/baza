import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeRow, updateRow, deleteRow } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sheet = searchParams.get('sheet');

  if (!sheet) {
    return NextResponse.json({ error: 'Sheet parameter is required' }, { status: 400 });
  }

  try {
    const data = await readSheet(sheet);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheet, action, id, data } = body;

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet parameter is required' }, { status: 400 });
    }

    if (action === 'write' || !action) {
      const result = await writeRow(sheet, data);
      return NextResponse.json({ success: result });
    }

    if (action === 'update') {
      if (!id) return NextResponse.json({ error: 'ID is required for update' }, { status: 400 });
      const result = await updateRow(sheet, id, data);
      return NextResponse.json({ success: result });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'ID is required for delete' }, { status: 400 });
      const result = await deleteRow(sheet, id);
      return NextResponse.json({ success: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
