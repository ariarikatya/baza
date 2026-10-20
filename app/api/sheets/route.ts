import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeRow, updateRow, deleteRow, deleteRowsByCriteria } from '@/lib/googleSheets';

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

    // Protect content management sheets on server API side
    // Normalize string by trimming and removing emojis or extra whitespace for comparison
    const normalizeName = (str: string) =>
      str.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')
         .trim()
         .toLowerCase();

    const protectedSheets = ['НОВОСТИ', 'АКЦИИ', 'СЕЗОННЫЕ ТУРНИРЫ', 'ДАТЫ ЕЖЕДНЕВНЫХ ИГР', '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'];
    const normalizedTarget = normalizeName(sheetName);
    const isProtectedSheet = protectedSheets.some(
      (s) => normalizeName(s) === normalizedTarget
    );

    if (isProtectedSheet) {
      const roleStr = String(body.userRole || '').trim();
      const isAdminFlag = body.isAdmin === true;

      // Special exemption for '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ':
      // Regular players (even with empty role) can register themselves (append)
      // or cancel THEIR OWN registration (delete_where matching their nick).
      const isOwnRegistrationAction =
        normalizedTarget === normalizeName('🎮 ЕЖЕДНЕВНЫЕ ИГРЫ') &&
        (action === 'append' ||
          (action === 'delete_where' && body.criteria && body.criteria['Ник']));

      if (!roleStr && !isAdminFlag && !isOwnRegistrationAction) {
        console.warn(`🔒 Permission denied for sheet "${sheetName}": role="${roleStr}", isAdmin=${isAdminFlag}`);
        return NextResponse.json({ success: false, error: 'Недостаточно прав: требуется непустая роль или статус администратора' }, { status: 403 });
      }
    }

    if (action === 'update_cell') {
      const { updateCell } = await import('@/lib/googleSheets');
      const row = Number(body.rowIndex || body.row || 2);
      const col = body.colIndex || body.col || 2; // Column B = 2
      const val = String(body.value || '').trim();
      const success = await updateCell(sheetName, row, col, val);
      return NextResponse.json({ success, sheetName, rowIndex: row, colIndex: col, value: val });
    }

    if (action === 'append' || action === 'write') {
      const success = await writeRow(sheetName, rowData);
      return NextResponse.json({ success });
    }

    if (action === 'update') {
      const roleStr = String(body.userRole || '').trim();
      const isAdminFlag = body.isAdmin === true;
      const hasCompletionField = rowData && (
        'Завершить турнир' in rowData ||
        'Завершено?' in rowData ||
        'Завершено' in rowData ||
        'gameCompleted' in rowData
      );

      if (hasCompletionField && !roleStr && !isAdminFlag) {
        console.warn(`🔒 Completion permission denied for sheet "${sheetName}": empty role and not admin`);
        return NextResponse.json({
          success: false,
          error: 'Недостаточно прав: для завершения игры или турнира требуется непустая роль или статус администратора',
        }, { status: 403 });
      }

      const searchKey = keyName || 'Ник';
      const targetDate = body.targetDate;
      const success = await updateRow(sheetName, searchKey, keyValue, rowData, { targetDate });
      return NextResponse.json({ success });
    }

    if (action === 'delete_where') {
      const criteria = body.criteria || {};
      const result = await deleteRowsByCriteria(sheetName, criteria);
      if (result.deletedCount === 0) {
        return NextResponse.json({
          success: false,
          deletedCount: 0,
          error: 'Запись не найдена и не удалена',
        });
      }
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      const searchKey = keyName || 'Ник';
      const success = await deleteRow(sheetName, searchKey, keyValue);
      if (!success) {
        return NextResponse.json({
          success: false,
          deletedCount: 0,
          error: 'Запись не найдена и не удалена',
        });
      }
      return NextResponse.json({ success: true, deletedCount: 1 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
