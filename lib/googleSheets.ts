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
      // Для листа "Игроки" пишем strictly в A:K, не трогая столбцы L:Q с формулами
      const valuesAK = PLAYER_AK_HEADERS.map((header: string) => {
        const value = rowData[header];
        return value !== undefined && value !== null ? String(value) : '';
      });

      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Игроки!A:K',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [valuesAK],
        },
      });

      console.log('✅ Успешно добавлена строка игрока в A:K');

      // Если переданы значения для колонок R:Y (после L:Q), записываем их в ту же новую строку
      const updatedRange = appendRes.data.updates?.updatedRange || '';
      const match = updatedRange.match(/\d+/);
      if (match) {
        const newRowIndex = parseInt(match[0], 10);
        const hasRYValues = PLAYER_RY_HEADERS.some((h) => rowData[h] !== undefined && rowData[h] !== null && rowData[h] !== '');
        if (hasRYValues) {
          const valuesRY = PLAYER_RY_HEADERS.map((header: string) => {
            const value = rowData[header];
            return value !== undefined && value !== null ? String(value) : '';
          });

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Игроки!R${newRowIndex}:Y${newRowIndex}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [valuesRY],
            },
          });
          console.log(`✅ Обновлены R:Y для нового игрока на строке ${newRowIndex}`);
        }
      }
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
    const isPlayersSheet = sheetName.trim().toLowerCase() === 'игроки';

    if (isPlayersSheet) {
      // Для листа "Игроки" обновляем точечные диапазоны A:K и R:Y, не затирая L:Q
      const updatedAK = PLAYER_AK_HEADERS.map((header: string) => {
        if (updatedFields[header] !== undefined && updatedFields[header] !== null) {
          return String(updatedFields[header]);
        }
        const actualIndex = headers.indexOf(header);
        return actualIndex !== -1 && currentRow[actualIndex] !== undefined ? String(currentRow[actualIndex]) : '';
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Игроки!A${rowIndex}:K${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedAK],
        },
      });

      const updatedRY = PLAYER_RY_HEADERS.map((header: string) => {
        if (updatedFields[header] !== undefined && updatedFields[header] !== null) {
          return String(updatedFields[header]);
        }
        const actualIndex = headers.indexOf(header);
        return actualIndex !== -1 && currentRow[actualIndex] !== undefined ? String(currentRow[actualIndex]) : '';
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Игроки!R${rowIndex}:Y${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedRY],
        },
      });

      console.log(`✅ Обновлена строка ${rowIndex} в "Игроки" (диапазоны A:K и R:Y)`);
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
