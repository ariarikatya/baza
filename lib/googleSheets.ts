import { google } from 'googleapis';

export type SheetRow = Record<string, any>;

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

export async function writeRow(sheetName: string, rowData: SheetRow): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.error('❌ ОШИБКА: Клиент не инициализирован');
    return false;
  }

  try {
    // ЧИТАЕМ ЗАГОЛОВКИ ИЗ ВСЕХ КОЛОНОК (до ZZ)
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ1`, // ВАЖНО: ZZ вместо Z
    });
    
    const headers = headerResponse.data.values?.[0];
    if (!headers) {
      console.error(`❌ Не удалось прочитать заголовки "${sheetName}"`);
      return false;
    }

    console.log(` Заголовки таблицы "${sheetName}":`, headers);

    // Формируем массив значений СТРОГО по порядку заголовков
    const valuesRow = headers.map((header: string) => {
      const value = rowData[header];
      if (value === undefined) {
        console.warn(`⚠️ Колонка "${header}" не найдена в данных`);
      }
      return value !== undefined ? String(value) : '';
    });

    console.log(`✅ Записываем строку в "${sheetName}":`, valuesRow.slice(0, 10), '...');

    // Добавляем строку
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:ZZ`, // ВАЖНО: ZZ вместо Z
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [valuesRow],
      },
    });

    console.log(`✅ Успешно добавлена строка в "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(` ОШИБКА записи в "${sheetName}":`, error);
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
    const keyIndex = headers.indexOf(searchKey);

    if (keyIndex === -1) {
      console.error(`❌ Колонка "${searchKey}" не найдена`);
      return false;
    }

    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][keyIndex]).trim().toLowerCase() === String(searchValue).trim().toLowerCase()) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(`⚠️ Строка "${searchValue}" не найдена`);
      return false;
    }

    const currentRow = rows[rowIndex - 1];
    const updatedRow = headers.map((header: string, index: number) => {
      if (updatedFields[header] !== undefined) {
        return String(updatedFields[header]);
      }
      return currentRow[index] !== undefined ? currentRow[index] : '';
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:ZZ${rowIndex}`, // ZZ вместо Z
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
    const keyIndex = headers.indexOf(searchKey);

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
