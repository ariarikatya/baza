import { google } from 'googleapis';

export type SheetRow = Record<string, any>;

function indexToColumnName(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountKey || !spreadsheetId) {
    console.error('❌ ОШИБКА: Отсутствуют GOOGLE_SERVICE_ACCOUNT_KEY или GOOGLE_SHEET_ID');
    return null;
  }

  try {
    const credentials = typeof serviceAccountKey === 'string' 
      ? JSON.parse(serviceAccountKey) 
      : serviceAccountKey;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('❌ ОШИБКА парсинга ключа:', err);
    return null;
  }
}

export async function readSheet(sheetName: string): Promise<SheetRow[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ10000`, // Читаем все колонки до ZZ
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const obj: SheetRow = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      return obj;
    });
  } catch (error) {
    console.error(` ОШИБКА чтения "${sheetName}":`, error);
    return [];
  }
}

export const PLAYERS_HEADERS = [
  'Ник',
  'Пароль',
  'Имя',
  'Роль',
  'Email',
  'Аватар',
  'Бан',
  'Авторизован?',
  'Telegram ID',
  'Анимация?',
  'Админ?',
  'User ID',
  'Общий рейтинг',
  'Статус',
  'Место',
  'QR',
  'QR URL',
  'Онлайн',
  'Играет?',
  'Авторизация шаги',
  'Соглашение о правилах',
  'Выбранный сезон',
  'Номер телефона',
  'Выбранный Игрок',
  '🔒 Row ID',
];

export const PLAYER_AK_HEADERS = [
  'Ник',
  'Пароль',
  'Имя',
  'Роль',
  'Email',
  'Аватар',
  'Бан',
  'Авторизован?',
  'Telegram ID',
  'Анимация?',
  'Админ?',
];

export const PLAYER_RY_HEADERS = [
  'Онлайн',
  'Играет?',
  'Авторизация шаги',
  'Соглашение о правилах',
  'Выбранный сезон',
  'Номер телефона',
  'Выбранный Игрок',
  '🔒 Row ID',
];

export const FORMULA_COLUMNS = ['user id', 'общий рейтинг', 'статус', 'место', 'qr', 'qr url'];

export async function writeRow(sheetName: string, rowData: SheetRow): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.error('❌ ОШИБКА: Клиент не инициализирован');
    return false;
  }

  try {
    const isPlayersSheet = sheetName.trim().toLowerCase() === 'игроки';

    if (isPlayersSheet) {
      // Читаем фактические заголовки листа Игроки
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Игроки!A1:ZZ1',
      });
      const headers: string[] = headerResponse.data.values?.[0] || PLAYERS_HEADERS;
      const lastColLetter = indexToColumnName(headers.length - 1);

      // Защита формульных колонок Q (16), R (17) и любых из FORMULA_COLUMNS
      const protectedIndices = new Set<number>([16, 17]);
      headers.forEach((h: string, idx: number) => {
        if (FORMULA_COLUMNS.includes(String(h || '').trim().toLowerCase())) {
          protectedIndices.add(idx);
        }
      });

      const valuesRow = headers.map((header: string, colIndex: number) => {
        if (protectedIndices.has(colIndex) || FORMULA_COLUMNS.includes(String(header || '').trim().toLowerCase())) {
          return '';
        }
        const value = rowData[header];
        return value !== undefined && value !== null ? String(value) : '';
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `Игроки!A1:${lastColLetter}`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [valuesRow],
        },
      });

      console.log(`✅ Успешно добавлена строка игрока в диапазон Игроки!A1:${lastColLetter}`);
      return true;
    }

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ1`,
    });
    const headers = headerResponse.data.values?.[0] || [];

    if (!headers || headers.length === 0) {
      console.error(`❌ Не удалось прочитать заголовки "${sheetName}"`);
      return false;
    }

    const valuesRow = headers.map((header: string) => {
      const value = rowData[header];
      return value !== undefined && value !== null ? String(value) : '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [valuesRow],
      },
    });

    console.log(`✅ Успешно добавлена строка в "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`ОШИБКА записи в "${sheetName}":`, error);
    return false;
  }
}

export async function updateRow(
  sheetName: string, 
  searchKey: string,
  searchValue: string,
  updatedFields: SheetRow
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`, // Читаем все колонки
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return false;

    const headers = rows[0];
    const keyIndex = headers.findIndex(
      (h) => String(h || '').trim().toLowerCase() === searchKey.trim().toLowerCase()
    );

    if (keyIndex === -1) {
      console.error(`❌ Колонка "${searchKey}" не найдена в листах`);
      return false;
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const cellVal = rows[i][keyIndex] !== undefined ? String(rows[i][keyIndex]).trim().toLowerCase() : '';
      if (cellVal === String(searchValue).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(`⚠️ Строка "${searchValue}" по ключу "${searchKey}" не найдена в "${sheetName}"`);
      if (updatedFields['Telegram ID']) {
        console.error(`❌ Telegram ID НЕ записан: строка "${searchValue}" по ключу "${searchKey}" не найдена`);
      }
      return false;
    }

    const currentRow = rows[rowIndex - 1];
    const isPlayersSheet = sheetName.trim().toLowerCase() === 'игроки';

    if (isPlayersSheet) {
      const dataToUpdate: Array<{ range: string; values: string[][] }> = [];

      // Защита колонок Q (16) и R (17) и любых из FORMULA_COLUMNS
      const protectedIndices = new Set<number>([16, 17]);
      headers.forEach((h: string, idx: number) => {
        if (FORMULA_COLUMNS.includes(String(h || '').trim().toLowerCase())) {
          protectedIndices.add(idx);
        }
      });

      for (const [key, val] of Object.entries(updatedFields)) {
        if (val === undefined) continue;
        const normalizedKey = key.trim().toLowerCase();

        const colIndex = headers.findIndex(
          (h) => String(h || '').trim().toLowerCase() === normalizedKey
        );

        if (colIndex !== -1) {
          if (protectedIndices.has(colIndex) || FORMULA_COLUMNS.includes(normalizedKey)) {
            console.log(`🔒 [updateRow] Пропущена запись в формульную колонку "${key}" (индекс ${colIndex}, ${indexToColumnName(colIndex)}) листа Игроки`);
            continue;
          }

          const colLetter = indexToColumnName(colIndex);
          dataToUpdate.push({
            range: `Игроки!${colLetter}${rowIndex}`,
            values: [[val !== null ? String(val) : '']],
          });

          if (normalizedKey === 'telegram id') {
            console.log(`✅ [Игроки] Telegram ID записан в ${colLetter}${rowIndex} = ${val}`);
          }
        } else {
          if (FORMULA_COLUMNS.includes(normalizedKey)) {
            console.log(`🔒 [updateRow] Пропущена попытка записи в формульное поле "${key}" (Игроки)`);
            continue;
          }
          console.warn(`⚠️ Колонка "${key}" не найдена в заголовках "Игроки"`);
          if (normalizedKey === 'telegram id') {
            console.error(`❌ Telegram ID НЕ записан: колонка "Telegram ID" не найдена в заголовках`);
          }
        }
      }

      if (dataToUpdate.length === 0) {
        console.log('⚠️ Нет полей для обновления в "Игроки"');
        return true;
      }

      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: dataToUpdate,
        },
      });

      console.log(`✅ [Игроки] Точечно обновлено ${dataToUpdate.length} ячеек для строки ${rowIndex} (${searchValue}):`, dataToUpdate.map((d) => d.range));
      return true;
    }

    const updatedRow = headers.map((header: string, index: number) => {
      if (updatedFields[header] !== undefined && updatedFields[header] !== null) {
        return String(updatedFields[header]);
      }
      return currentRow[index] !== undefined ? currentRow[index] : '';
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log(`✅ Обновлено строка ${rowIndex} в "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА обновления в "${sheetName}":`, error);
    return false;
  }
}

function normalizeSheetDate(dateStr: string): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (/^\d{2}\.\d{2}\.\d{4}/.test(str)) {
    return str.length === 16 ? str + ':00' : str;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function deleteRowsByCriteria(
  sheetName: string,
  criteria: Record<string, string>
): Promise<{ success: boolean; deletedCount: number }> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return { success: false, deletedCount: 0 };

  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetObj = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title?.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );

    const sheetId = sheetObj?.properties?.sheetId ?? 0;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return { success: true, deletedCount: 0 };

    const headers = rows[0].map((h: any) => String(h || '').trim());

    // Find row indices (1-based for display, 0-based index for API)
    const matchingRowIndices: number[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      let matchesAll = true;

      for (const [critKey, critVal] of Object.entries(criteria)) {
        if (!critVal) continue;
        const colIndex = headers.findIndex(
          (h) => h.toLowerCase() === critKey.trim().toLowerCase()
        );

        if (colIndex === -1) {
          matchesAll = false;
          break;
        }

        const cellValue = row[colIndex] !== undefined ? String(row[colIndex]).trim() : '';

        // Check if field is a Date field
        if (critKey.trim().toLowerCase().includes('дата') || critKey.trim().toLowerCase().includes('date')) {
          const normCellDate = normalizeSheetDate(cellValue);
          const normCritDate = normalizeSheetDate(critVal);

          const rawCellPrefix = cellValue.slice(0, 10);
          const rawCritPrefix = critVal.slice(0, 10);

          const cellDateObj = new Date(cellValue);
          const critDateObj = new Date(critVal);

          const datesEqual =
            normCellDate === normCritDate ||
            cellValue.toLowerCase() === critVal.toLowerCase() ||
            (rawCellPrefix && rawCritPrefix && rawCellPrefix === rawCritPrefix) ||
            (!isNaN(cellDateObj.getTime()) && !isNaN(critDateObj.getTime()) && cellDateObj.getTime() === critDateObj.getTime());

          if (!datesEqual) {
            matchesAll = false;
            break;
          }
        } else {
          if (cellValue.toLowerCase() !== critVal.trim().toLowerCase()) {
            matchesAll = false;
            break;
          }
        }
      }

      if (matchesAll) {
        matchingRowIndices.push(i);
      }
    }

    if (matchingRowIndices.length === 0) {
      console.log(`⚠️ [deleteRowsByCriteria] Не найдено строк для удаления в "${sheetName}" по критериям:`, criteria);
      return { success: true, deletedCount: 0 };
    }

    // Sort descending so row indices don't shift during deletion
    matchingRowIndices.sort((a, b) => b - a);

    const requests = matchingRowIndices.map((rowIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    console.log(`✅ [deleteRowsByCriteria] Удалено ${matchingRowIndices.length} строк из "${sheetName}"`);
    return { success: true, deletedCount: matchingRowIndices.length };
  } catch (error) {
    console.error(`❌ ОШИБКА удаления по критериям из "${sheetName}":`, error);
    return { success: false, deletedCount: 0 };
  }
}

export async function deleteRow(sheetName: string, searchKey: string, searchValue: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return false;

    const headers = rows[0];
    const keyIndex = headers.findIndex(
      (h) => String(h || '').trim().toLowerCase() === searchKey.trim().toLowerCase()
    );

    if (keyIndex === -1) return false;

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][keyIndex]).trim().toLowerCase() === String(searchValue).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return false;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Удалена строка ${rowIndex} из "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА удаления из "${sheetName}":`, error);
    return false;
  }
}
