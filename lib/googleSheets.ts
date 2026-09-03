import { google } from 'googleapis';

// Типизация для строк (используй любые поля, главное - обращение через ['ИмяКолонки'])
export type SheetRow = Record<string, any>;

function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountKey || !spreadsheetId) {
    console.error('❌ ОШИБКА: Отсутствуют GOOGLE_SERVICE_ACCOUNT_KEY или GOOGLE_SHEET_ID в переменных окружения Vercel!');
    return null;
  }

  try {
    // Парсим JSON ключа. Если он с переносами строк и не валиден, здесь будет ошибка.
    const credentials = typeof serviceAccountKey === 'string' 
      ? JSON.parse(serviceAccountKey) 
      : serviceAccountKey;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('❌ ОШИБКА: Не удалось распарсить GOOGLE_SERVICE_ACCOUNT_KEY. Убедись, что это JSON в ОДНУ строку.', err);
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
      range: `${sheetName}!A1:ZZ10000`, // Читаем с запасом
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return []; // Нет данных или только заголовки

    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const obj: SheetRow = {};
      headers.forEach((header, index) => {
        // Сохраняем точное название колонки из Google Sheets
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`❌ ОШИБКА чтения листа "${sheetName}":`, error);
    return [];
  }
}

export async function writeRow(sheetName: string, rowData: SheetRow): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.error('❌ ОШИБКА записи: Клиент Google Sheets не инициализирован.');
    return false;
  }

  try {
    // 1. Сначала читаем заголовки, чтобы знать порядок колонок
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    
    const headers = headerResponse.data.values?.[0];
    if (!headers) {
      console.error(`❌ ОШИБКА: Не удалось прочитать заголовки листа "${sheetName}". Возможно, лист пуст или называется неправильно.`);
      return false;
    }

    // 2. Формируем массив значений строго в порядке заголовков таблицы
    const valuesRow = headers.map((header: string) => {
      // Если в rowData нет такого ключа, пишем пустую строку
      return rowData[header] !== undefined ? String(rowData[header]) : '';
    });

    // 3. Добавляем строку в конец
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [valuesRow],
      },
    });

    console.log(`✅ Успешно добавлена строка в лист "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА записи в лист "${sheetName}":`, error);
    return false;
  }
}

export async function updateRow(
  sheetName: string, 
  searchKey: string, // Например, 'Ник'
  searchValue: string, // Например, 'Котя'
  updatedFields: SheetRow
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    // 1. Читаем весь лист, чтобы найти нужную строку
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return false;

    const headers = rows[0];
    const keyIndex = headers.indexOf(searchKey);

    if (keyIndex === -1) {
      console.error(`❌ ОШИБКА: Колонка "${searchKey}" не найдена в листе "${sheetName}".`);
      return false;
    }

    // 2. Ищем строку (начинаем с 1, так как 0 - это заголовки)
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][keyIndex]).trim().toLowerCase() === String(searchValue).trim().toLowerCase()) {
        rowIndex = i + 1; // +1 потому что API использует 1-индексацию, и +1 потому что массив с 0
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(`⚠️ Строка со значением "${searchValue}" по ключу "${searchKey}" не найдена в листе "${sheetName}".`);
      return false;
    }

    // 3. Формируем обновленную строку
    const currentRow = rows[rowIndex - 1];
    const updatedRow = headers.map((header: string, index: number) => {
      // Если поле есть в updatedFields, берем его, иначе оставляем старое значение
      if (updatedFields[header] !== undefined) {
        return String(updatedFields[header]);
      }
      return currentRow[index] !== undefined ? currentRow[index] : '';
    });

    // 4. Обновляем строку в Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log(`✅ Успешно обновлена строка ${rowIndex} в листе "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА обновления в листе "${sheetName}":`, error);
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
      range: `${sheetName}!A:Z`,
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

    // В Google Sheets API v4 нет прямого "delete row" через values, нужно использовать batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 0, // Предполагаем, что это первый лист (обычно так и есть)
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ Успешно удалена строка ${rowIndex} из листа "${sheetName}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА удаления из листа "${sheetName}":`, error);
    return false;
  }
}
