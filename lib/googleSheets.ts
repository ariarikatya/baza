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

export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '')
    .trim()
    .toLowerCase();
}

export function formatSheetRange(sheetName: string, cellRange: string): string {
  const cleanTitle = sheetName.replace(/'/g, '');
  const needsQuotes = /[\s'!"#$%&()*,:;<=>?@\[\\\]^`{|}~-]/.test(cleanTitle);
  return needsQuotes ? `'${cleanTitle}'!${cellRange}` : `${cleanTitle}!${cellRange}`;
}

async function getCanonicalSheetTitle(
  sheets: any,
  spreadsheetId: string,
  sheetName: string
): Promise<{ title: string; sheetId?: number }> {
  try {
    if (sheets?.spreadsheets?.get && typeof sheets.spreadsheets.get === 'function') {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetList = spreadsheet.data?.sheets || [];

      const targetNormalized = normalizeName(sheetName);

      // 1. Exact match (case-insensitive trim)
      let matched = sheetList.find(
        (s: any) => String(s.properties?.title || '').trim().toLowerCase() === sheetName.trim().toLowerCase()
      );

      // 2. Normalized match (ignoring emojis/whitespace)
      if (!matched) {
        matched = sheetList.find(
          (s: any) => normalizeName(String(s.properties?.title || '')) === targetNormalized
        );
      }

      if (matched && matched.properties?.title) {
        return {
          title: matched.properties.title,
          sheetId: matched.properties.sheetId,
        };
      }
    }
  } catch (err) {
    console.error(`❌ [getCanonicalSheetTitle] Ошибка получения структуры таблицы:`, err);
  }
  return { title: sheetName };
}

export function parseToDateObj(str: any): Date | null {
  if (!str) return null;
  const s = String(str).trim();
  if (!s) return null;

  // DD.MM.YYYY or DD.MM.YYYY HH:mm or DD.MM.YYYY HH:mm:ss
  const ruMatch = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ruMatch) {
    const day = parseInt(ruMatch[1], 10);
    const month = parseInt(ruMatch[2], 10) - 1;
    const year = parseInt(ruMatch[3], 10);
    const hours = ruMatch[4] ? parseInt(ruMatch[4], 10) : 0;
    const minutes = ruMatch[5] ? parseInt(ruMatch[5], 10) : 0;
    return new Date(year, month, day, hours, minutes);
  }

  // Handle Excel serial date if string is numeric (e.g. 46000)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = serial - Math.floor(serial) + 0.0000001;
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60) % 60;
    return new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizeSheetDate(dateStr: string): string {
  const d = parseToDateObj(dateStr);
  if (!d) return String(dateStr || '').trim();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isDateEqual(val1: string, val2: string): boolean {
  if (!val1 || !val2) return false;
  const raw1 = String(val1).trim().toLowerCase();
  const raw2 = String(val2).trim().toLowerCase();
  if (raw1 === raw2) return true;

  const norm1 = normalizeSheetDate(val1);
  const norm2 = normalizeSheetDate(val2);
  if (norm1 && norm2 && norm1 === norm2) return true;

  const d1 = parseToDateObj(val1);
  const d2 = parseToDateObj(val2);
  if (d1 && d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate() &&
      d1.getHours() === d2.getHours() &&
      d1.getMinutes() === d2.getMinutes()
    );
  }
  return false;
}

export async function readSheet(sheetName: string): Promise<SheetRow[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return [];

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1:ZZ10000'),
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    return rows
      .slice(1)
      .map((row) => {
        const obj: SheetRow = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] !== undefined ? row[index] : '';
        });
        return obj;
      })
      .filter((obj) => Object.values(obj).some((v) => String(v).trim() !== ''));
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
  'Веб-уведомления',
  'Push Subscription',
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
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const isPlayersSheet = normalizeName(canonicalTitle) === 'игроки';

    if (isPlayersSheet) {
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: formatSheetRange(canonicalTitle, 'A1:ZZ1'),
      });
      const headers: string[] = headerResponse.data.values?.[0] || PLAYERS_HEADERS;
      const lastColLetter = indexToColumnName(headers.length - 1);

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
        range: formatSheetRange(canonicalTitle, `A1:${lastColLetter}`),
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [valuesRow],
        },
      });

      console.log(`✅ Успешно добавлена строка игрока в диапазон '${canonicalTitle}'!A1:${lastColLetter}`);
      return true;
    }

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1:ZZ1'),
    });
    const headers = headerResponse.data.values?.[0] || [];

    if (!headers || headers.length === 0) {
      console.error(`❌ Не удалось прочитать заголовки "${canonicalTitle}"`);
      return false;
    }

    const valuesRow = headers.map((header: string) => {
      const value = rowData[header];
      return value !== undefined && value !== null ? String(value) : '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [valuesRow],
      },
    });

    console.log(`✅ Успешно добавлена строка в "${canonicalTitle}"`);
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
  updatedFields: SheetRow,
  options?: { targetDate?: string }
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A:ZZ'),
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return false;

    const headers = rows[0];
    const isDateField = searchKey.trim().toLowerCase().includes('дата') || searchKey.trim().toLowerCase().includes('date');

    let keyIndex = headers.findIndex(
      (h) => normalizeName(String(h || '')) === normalizeName(searchKey)
    );

    if (keyIndex === -1 && isDateField) {
      keyIndex = headers.findIndex((h) => {
        const norm = normalizeName(String(h || ''));
        return norm.includes('дата') || norm.includes('date');
      });
    }

    let rowIndex = -1;

    const dateColIndex = headers.findIndex((h) => {
      const norm = normalizeName(String(h || ''));
      return norm === 'дата' || norm === 'дата и время';
    });

    // 1. Primary search on key column
    if (keyIndex !== -1) {
      for (let i = 1; i < rows.length; i++) {
        const cellVal = rows[i][keyIndex] !== undefined ? String(rows[i][keyIndex]).trim() : '';

        let isMatch = false;
        if (isDateField) {
          isMatch = isDateEqual(cellVal, searchValue);
        } else {
          isMatch = cellVal.toLowerCase() === String(searchValue).trim().toLowerCase();
        }

        if (isMatch) {
          if (options?.targetDate && dateColIndex !== -1) {
            const rowDateVal = rows[i][dateColIndex] !== undefined ? String(rows[i][dateColIndex]).trim() : '';
            if (!isDateEqual(rowDateVal, options.targetDate)) {
              continue;
            }
          }
          rowIndex = i + 1;
          break;
        }
      }
    }

    // 2. Fallback search across all cells in row if key column search failed
    if (rowIndex === -1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowMatched = row.some((cell: any) => {
          const cellStr = String(cell || '').trim();
          if (!cellStr) return false;
          if (cellStr.toLowerCase() === String(searchValue).trim().toLowerCase()) return true;
          if (isDateField || cellStr.includes('.')) {
            return isDateEqual(cellStr, searchValue);
          }
          return false;
        });

        if (rowMatched) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    if (rowIndex === -1) {
      console.warn(`⚠️ [updateRow] Строка "${searchValue}" по ключу "${searchKey}" не найдена в "${canonicalTitle}"`);
      if (updatedFields['Telegram ID']) {
        console.error(`❌ Telegram ID НЕ записан: строка "${searchValue}" по ключу "${searchKey}" не найдена`);
      }
      return false;
    }

    const currentRow = rows[rowIndex - 1];
    const isPlayersSheet = normalizeName(canonicalTitle) === 'игроки';

    if (isPlayersSheet) {
      const dataToUpdate: Array<{ range: string; values: string[][] }> = [];

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
            range: formatSheetRange(canonicalTitle, `${colLetter}${rowIndex}`),
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
      range: formatSheetRange(canonicalTitle, `A${rowIndex}`),
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log(`✅ Обновлено строка ${rowIndex} в "${canonicalTitle}"`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА обновления в "${sheetName}":`, error);
    return false;
  }
}

export async function deleteRowsByCriteria(
  sheetName: string,
  criteria: Record<string, string>
): Promise<{ success: boolean; deletedCount: number }> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return { success: false, deletedCount: 0 };

  try {
    const { title: canonicalTitle, sheetId } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);

    if (sheetId === undefined || sheetId === null) {
      console.error(`❌ [deleteRowsByCriteria] Лист "${sheetName}" (каноничный: "${canonicalTitle}") не найден в Google Таблице`);
      return { success: false, deletedCount: 0 };
    }

    const rangeStr = formatSheetRange(canonicalTitle, 'A:ZZ');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeStr,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.warn(`⚠️ [deleteRowsByCriteria] Лист "${canonicalTitle}" (sheetId: ${sheetId}) пуст или не содержит строк с данными`);
      return { success: true, deletedCount: 0 };
    }

    const headers = rows[0].map((h: any) => String(h || '').trim());

    // Diagnostic logging
    const criteriaLogged = Object.entries(criteria).map(([k, v]) => `${k}="${v}"`).join(', ');
    console.log(`🔍 [deleteRowsByCriteria] Запрос удаления из "${canonicalTitle}" (sheetId: ${sheetId}), диапазон: "${rangeStr}", прочитано строк: ${rows.length - 1}. Критерии: [${criteriaLogged}]`);

    for (const [critKey] of Object.entries(criteria)) {
      const colIdx = headers.findIndex((h) => normalizeName(h) === normalizeName(critKey));
      if (colIdx !== -1) {
        const first10 = rows.slice(1, 11).map((r) => (r[colIdx] !== undefined ? String(r[colIdx]).trim() : ''));
        console.log(`📋 [deleteRowsByCriteria] Колонки "${critKey}" (индекс ${colIdx}), первые 10 значений:`, first10);
      } else {
        console.warn(`⚠️ [deleteRowsByCriteria] Колонка для критерия "${critKey}" не найдена в заголовках:`, headers);
      }
    }

    const matchingRowIndices: number[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      let matchesAll = true;

      for (const [critKey, critVal] of Object.entries(criteria)) {
        if (!critVal) continue;
        const colIndex = headers.findIndex(
          (h) => normalizeName(h) === normalizeName(critKey)
        );

        if (colIndex === -1) {
          matchesAll = false;
          break;
        }

        const cellValue = row[colIndex] !== undefined ? String(row[colIndex]).trim() : '';
        const isDateField = critKey.trim().toLowerCase().includes('дата') || critKey.trim().toLowerCase().includes('date');

        if (isDateField) {
          if (!isDateEqual(cellValue, critVal)) {
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
      console.log(`⚠️ [deleteRowsByCriteria] Не найдено строк для удаления в "${canonicalTitle}" по критериям:`, criteria);
      return { success: true, deletedCount: 0 };
    }

    console.log(`🎯 [deleteRowsByCriteria] Лист "${canonicalTitle}": найдено ${matchingRowIndices.length} совпадений (строки: ${matchingRowIndices.map(i => i + 1).join(', ')})`);

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

    console.log(`✅ [deleteRowsByCriteria] Успешно удалено ${matchingRowIndices.length} строк из "${canonicalTitle}" (sheetId: ${sheetId})`);
    return { success: true, deletedCount: matchingRowIndices.length };
  } catch (error) {
    console.error(`❌ ОШИБКА удаления по критериям из "${sheetName}":`, error);
    return { success: false, deletedCount: 0 };
  }
}

export async function readSheetRawDisplayValues(sheetName: string): Promise<string[][]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return [];

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1:ZZ10000'),
      valueRenderOption: 'FORMATTED_VALUE',
    });

    return (response.data.values || []) as string[][];
  } catch (error) {
    console.error(`❌ ОШИБКА чтения raw display values "${sheetName}":`, error);
    return [];
  }
}

export async function readSheetRawValues(sheetName: string): Promise<any[][]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return [];

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1:ZZ10000'),
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    return response.data.values || [];
  } catch (error) {
    console.error(`❌ ОШИБКА чтения raw values "${sheetName}":`, error);
    return [];
  }
}

export async function updateCell(
  sheetName: string,
  rowIndex: number,
  col: number | string,
  value: any
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const colLetter = typeof col === 'number' ? indexToColumnName(col - 1) : col;
    const range = formatSheetRange(canonicalTitle, `${colLetter}${rowIndex}`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value !== null && value !== undefined ? String(value) : '']],
      },
    });
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА обновления ячейки в "${sheetName}":`, error);
    return false;
  }
}

export async function clearCell(
  sheetName: string,
  rowIndex: number,
  col: number | string
): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    const colLetter = typeof col === 'number' ? indexToColumnName(col - 1) : col;
    const range = `'${canonicalTitle}'!${colLetter}${rowIndex}`;

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА очистки ячейки в "${sheetName}":`, error);
    return false;
  }
}

export async function appendRowValues(sheetName: string, values: any[]): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const { title: canonicalTitle } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: formatSheetRange(canonicalTitle, 'A1'),
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values.map((v) => (v !== null && v !== undefined ? String(v) : ''))],
      },
    });
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА добавления строки в "${sheetName}":`, error);
    return false;
  }
}

export async function deleteRow(sheetName: string, searchKey: string, searchValue: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) return false;

  try {
    const { title: canonicalTitle, sheetId } = await getCanonicalSheetTitle(sheets, spreadsheetId, sheetName);

    if (sheetId === undefined || sheetId === null) {
      console.error(`❌ [deleteRow] Лист "${sheetName}" (каноничный: "${canonicalTitle}") не найден в Google Таблице`);
      return false;
    }

    const rangeStr = formatSheetRange(canonicalTitle, 'A:ZZ');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: rangeStr,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.warn(`⚠️ [deleteRow] Лист "${canonicalTitle}" (sheetId: ${sheetId}) пуст или не содержит строк с данными`);
      return false;
    }

    const headers = rows[0];

    // Diagnostic logging
    console.log(`🔍 [deleteRow] Запрос удаления из "${canonicalTitle}" (sheetId: ${sheetId}), диапазон: "${rangeStr}", прочитано строк: ${rows.length - 1}. Ищем "${searchValue}" по ключу "${searchKey}"`);

    const keyIndex = headers.findIndex(
      (h: any) => normalizeName(String(h || '')) === normalizeName(searchKey)
    );

    if (keyIndex !== -1) {
      const first10 = rows.slice(1, 11).map((r) => (r[keyIndex] !== undefined ? String(r[keyIndex]).trim() : ''));
      console.log(`📋 [deleteRow] Колонка "${searchKey}" (индекс ${keyIndex}), первые 10 значений:`, first10);
    } else {
      console.warn(`⚠️ [deleteRow] Колонка "${searchKey}" не найдена в заголовках листа "${canonicalTitle}":`, headers);
    }

    let rowIndex = -1;
    const isDateField = searchKey.trim().toLowerCase().includes('дата') || searchKey.trim().toLowerCase().includes('date');

    // 1. Primary search by searchKey column if column exists
    if (keyIndex !== -1) {
      for (let i = 1; i < rows.length; i++) {
        const cellVal = rows[i][keyIndex] !== undefined ? String(rows[i][keyIndex]).trim() : '';

        if (isDateField) {
          if (isDateEqual(cellVal, searchValue)) {
            rowIndex = i + 1;
            break;
          }
        } else {
          if (cellVal.toLowerCase() === String(searchValue).trim().toLowerCase()) {
            rowIndex = i + 1;
            break;
          }
        }
      }
    }

    // 2. Fallback search: if exact match on key column failed or column was not found, search all cells in row
    if (rowIndex === -1) {
      console.log(`🔍 [deleteRow] Запускается fallback-поиск строки в "${canonicalTitle}" по значению "${searchValue}" во всех колонках...`);
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowMatched = row.some((cell: any) => {
          const cellStr = String(cell || '').trim();
          if (!cellStr) return false;
          if (cellStr.toLowerCase() === String(searchValue).trim().toLowerCase()) return true;
          if (isDateField || cellStr.includes('.')) {
            return isDateEqual(cellStr, searchValue);
          }
          return false;
        });

        if (rowMatched) {
          rowIndex = i + 1;
          console.log(`🎯 [deleteRow] Fallback-поиск нашёл совпадение в строке ${rowIndex}`);
          break;
        }
      }
    }

    if (rowIndex === -1) {
      console.warn(`⚠️ [deleteRow] Строка с значением "${searchValue}" по ключу "${searchKey}" не найдена в "${canonicalTitle}"`);
      return false;
    }

    console.log(`🎯 [deleteRow] Лист "${canonicalTitle}": найдена строка ${rowIndex} по ключу "${searchKey}" = "${searchValue}"`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    console.log(`✅ [deleteRow] Успешно удалена строка ${rowIndex} из "${canonicalTitle}" (sheetId: ${sheetId})`);
    return true;
  } catch (error) {
    console.error(`❌ ОШИБКА удаления из "${sheetName}":`, error);
    return false;
  }
}
