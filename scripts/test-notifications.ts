import { google } from 'googleapis';

// Set dummy env variables BEFORE importing lib/notifications
process.env.GOOGLE_SERVICE_ACCOUNT_KEY = '{"type":"service_account"}';
process.env.GOOGLE_SHEET_ID = 'dummy_sheet_id';
process.env.TELEGRAM_BOT_TOKEN = 'mock_token';

// Mock sheet data
const mockSheetData: Record<string, any[][]> = {
  'НОВОСТИ': [
    ['Заголовок', 'Текст', 'Дата', 'Автор', 'Фото', 'Уведомление'],
    ['Новость 1', 'Текст новости 1 19:30:00', '17.10.2024', 'Админ', 'http://photo.jpg', 'Да'],
    ['Новость 2', 'Текст новости 2', '17.10.2024', 'Админ', '', '✓'],
    ['Новость 3', 'Текст новости 3', '17.10.2024', 'Админ', '', 'TRUE'],
  ],
  'АКЦИИ': [
    ['Название', 'Описание', 'Дата начала', 'Дата окончания', 'Уведомление', 'Картинка'],
    ['Акция 1', 'Описание акции', '17.10.2024', '20.10.2024', 'Да', 'http://promo.jpg'],
  ],
  'СЕЗОННЫЕ ТУРНИРЫ': [
    ['Название', 'Дата начала', 'Дата окончания', 'Взнос', 'Статус', 'Описание', 'Фото', 'Предоплата?', 'Уведомление о новом турнире', 'Завершить турнир'],
    ['Сезон 1', '01.10', '31.10', '5000', 'Активен', 'Описание сезонки', '', 'Да', 'Да', 'Нет'],
  ],
  'Игроки': [
    ['Ник', 'Имя', 'Фамилия', 'Роль', 'Телефон', 'Email', 'Баланс', 'Рейтинг', 'Telegram ID'],
    ['Player1', 'Иван', 'Иванов', 'Игрок', '123', 'test@test.com', 0, 100, '999111'],
  ],
};

const updatedCells: { sheetName: string; row: number; col: number; val: any }[] = [];

// Mock Google Sheets API via googleapis
(google as any).auth.GoogleAuth = class MockGoogleAuth {
  async getClient() {
    return {};
  }
};

(google as any).sheets = () => ({
  spreadsheets: {
    values: {
      get: async ({ range }: { range: string }) => {
        const sheetName = range.split('!')[0].replace(/'/g, '');
        const data = mockSheetData[sheetName];
        return { data: { values: data || [] } };
      },
      update: async ({ range, requestBody }: any) => {
        const sheetName = range.split('!')[0].replace(/'/g, '');
        const cell = range.split('!')[1];
        const colLetter = cell[0];
        const row = parseInt(cell.slice(1), 10);
        const col = colLetter.charCodeAt(0) - 64;
        const val = requestBody.values[0][0];
        updatedCells.push({ sheetName, row, col, val });
        if (mockSheetData[sheetName] && mockSheetData[sheetName][row - 1]) {
          mockSheetData[sheetName][row - 1][col - 1] = val;
        }
        return { data: {} };
      },
    },
  },
});

// Mock fetch for Telegram API
const sentTelegramMessages: any[] = [];
global.fetch = async (url: any, options: any) => {
  const body = options?.body ? JSON.parse(options.body) : {};
  sentTelegramMessages.push({ url: String(url), body });
  return {
    json: async () => ({ ok: true, result: {} }),
  } as any;
};

// Dynamically import lib/notifications and lib/googleSheets after env vars are set
import {
  SHEETS,
  processFlagBroadcast,
  checkGeneralNotifications,
  checkGameNotifications,
  sendGameInvitations,
  cleanNotificationValue,
  extractTitleAndText,
  escapeHtml,
  stripSeconds,
  getGameStartMs,
} from '../lib/notifications';
import { isDateEqual } from '../lib/googleSheets';

async function runNotificationsTests() {
  console.log('🚀 Starting Notifications & Sheet Constants test suite...\n');

  // --- Test 0: getGameStartMs Date-Only String Safety ---
  console.log('--- Test 0: getGameStartMs Date-Only String Safety ---');
  const dateOnlyMs = getGameStartMs('25.10.2025');
  if (dateOnlyMs === null || isNaN(dateOnlyMs)) {
    throw new Error(`getGameStartMs('25.10.2025') returned invalid result: ${dateOnlyMs}`);
  }
  console.log('✅ Test 0 Passed: Date-only string parsed safely without NaN!');

  // --- Test 1: Verify SHEETS constants match expected UI sheet names ---
  console.log('\n--- Test 1: SHEETS Constants Exact Names ---');
  if (SHEETS.NEWS !== 'НОВОСТИ') throw new Error(`SHEETS.NEWS expected 'НОВОСТИ', got '${SHEETS.NEWS}'`);
  if (SHEETS.PROMOTIONS !== 'АКЦИИ') throw new Error(`SHEETS.PROMOTIONS expected 'АКЦИИ', got '${SHEETS.PROMOTIONS}'`);
  if (SHEETS.SEASONS !== 'СЕЗОННЫЕ ТУРНИРЫ') throw new Error(`SHEETS.SEASONS expected 'СЕЗОННЫЕ ТУРНИРЫ', got '${SHEETS.SEASONS}'`);
  console.log('✅ Test 1 Passed: SHEETS constants match exact UI sheet names!');

  // --- Test 2: processFlagBroadcast with missing/empty sheet returns processed: -1 and sheetNotFound: true ---
  console.log('\n--- Test 2: Missing/Empty Sheet Guard ---');
  const missingRes = await processFlagBroadcast('НЕСУЩЕСТВУЮЩИЙ_ЛИСТ');
  if (missingRes.processed !== -1 || missingRes.sheetNotFound !== true) {
    throw new Error(`Expected processed: -1, sheetNotFound: true for missing sheet. Got: ${JSON.stringify(missingRes)}`);
  }
  console.log('✅ Test 2 Passed: Missing sheet guard returned processed: -1 and sheetNotFound: true!');

  // --- Test 3: processFlagBroadcast processes 'Да' and 'TRUE' and header startsWith('уведомление') ---
  console.log('\n--- Test 3: Notification Broadcast & Checkbox TRUE Matching ---');
  updatedCells.length = 0;
  sentTelegramMessages.length = 0;

  const cronRes = await checkGeneralNotifications();
  if (cronRes.broadcasts <= 0 || cronRes.processed <= 0) {
    throw new Error(`checkGeneralNotifications failed to process notifications: ${JSON.stringify(cronRes)}`);
  }

  const newsCol6Updates = updatedCells.filter((c) => c.sheetName === 'НОВОСТИ' && c.col === 6 && c.val === '✓');
  if (newsCol6Updates.length !== 2) {
    throw new Error(`Expected 2 rows in НОВОСТИ to be marked '✓' (including TRUE checkbox), got ${newsCol6Updates.length}`);
  }

  const seasonCol9Updates = updatedCells.filter((c) => c.sheetName === 'СЕЗОННЫЕ ТУРНИРЫ' && c.col === 9 && c.val === '✓');
  if (seasonCol9Updates.length !== 1) {
    throw new Error(`Expected 1 row in СЕЗОННЫЕ ТУРНИРЫ (header 'Уведомление о новом турнире', col 9) to be marked '✓', got ${seasonCol9Updates.length}`);
  }

  console.log('✅ Test 3 Passed: Successfully processed broadcasts for "Да", "TRUE", and header "Уведомление о новом турнире"!');

  // --- Test 4: Idempotency - second run sends 0 notifications ---
  console.log('\n--- Test 4: Notification Idempotency ---');
  const cronRes2 = await checkGeneralNotifications();
  if (cronRes2.sent !== 0 || cronRes2.processed !== 0) {
    throw new Error(`Second run should send 0 notifications, got: ${JSON.stringify(cronRes2)}`);
  }
  console.log('✅ Test 4 Passed: Second run sent 0 notifications!');

  // --- Test 5: Exclude technical serial numbers and strip seconds ---
  console.log('\n--- Test 5: Serial Date Filtering, Title/Text Extraction & Seconds Stripping ---');
  if (cleanNotificationValue('46056') !== '') {
    throw new Error(`Expected cleanNotificationValue('46056') to be empty, got '${cleanNotificationValue('46056')}'`);
  }
  if (stripSeconds('Турнир в 19:00:00 состоялся 24.10.2024 19:30:00') !== 'Турнир в 19:00 состоялся 24.10.2024 19:30') {
    throw new Error(`stripSeconds failed: got '${stripSeconds('Турнир в 19:00:00 состоялся 24.10.2024 19:30:00')}'`);
  }

  const sampleRowWithSerial = [46056, 'Важная Новость 18:00:00', 'Текст новости без чисел 19:00:00', 'Админ', '', 'Да'];
  const sampleHeaders = ['Дата', 'Заголовок', 'Текст', 'Автор', 'Фото', 'Уведомление'];
  const extracted = extractTitleAndText(sampleRowWithSerial, sampleHeaders);
  if (extracted.title !== 'Важная Новость 18:00' || extracted.text !== 'Текст новости без чисел 19:00') {
    throw new Error(`Failed to extract title and text correctly without seconds: ${JSON.stringify(extracted)}`);
  }
  console.log('✅ Test 5 Passed: Bare serial numbers excluded, title/text extracted properly, and seconds stripped!');

  // --- Test 6: Column K Description Formatting & HTML Escaping ---
  console.log('\n--- Test 6: Column K & Column P Notification Text Formatting ---');
  if (escapeHtml('Мафия & Ко <Игра>') !== 'Мафия &amp; Ко &lt;Игра&gt;') {
    throw new Error(`escapeHtml failed: got ${escapeHtml('Мафия & Ко <Игра>')}`);
  }

  mockSheetData['Даты ежедневных игр'] = [
    ['Дата', 'Сезон', 'Завершено', 'Всего игроков', 'Банк', 'Стоимость', 'Вес', 'Уведомление', 'Статус', 'Уведомлено отсутствующих', 'Описание', '11', '12', '13', 'Фото', 'Что будет'],
    ['25.10.2025 19:00:00', 'Сезон 1', 'Нет', '0', '3000', '3000', '1', 'Да', 'Нормальный', 'Нет', 'Классическая мафия 19:00:00', '', '', '', '', 'Интересные ролевые карты & правила'],
  ];

  sentTelegramMessages.length = 0;
  const gameNotifRes = await checkGameNotifications();
  if (gameNotifRes.processed !== 1 || gameNotifRes.sent !== 1) {
    throw new Error(`checkGameNotifications failed: ${JSON.stringify(gameNotifRes)}`);
  }

  const sentMsg = sentTelegramMessages.find((m) => m.body.text && m.body.text.includes('Открыта запись'));
  if (!sentMsg) {
    throw new Error('Game notification message not sent to Telegram mock!');
  }

  const msgText = sentMsg.body.text;
  if (msgText.includes(':00:00')) {
    throw new Error(`Message text contains seconds ':00:00':\n${msgText}`);
  }

  if (!msgText.includes('📋 Классическая мафия 19:00')) {
    throw new Error(`Expected column K description '📋 Классическая мафия 19:00' in message, got:\n${msgText}`);
  }

  console.log('✅ Test 6 Passed: Column K description formatted correctly and seconds stripped!');

  // --- Test 7: sendGameInvitations 12h past window & 2h window handling ---
  console.log('\n--- Test 7: Game Invitations Window Flag Handling ---');
  updatedCells.length = 0;
  const future2hDate = new Date(Date.now() + 1 * 3600 * 1000 + 4 * 3600 * 1000); // 1h in future Saratov wall time
  const future2hStr = `${String(future2hDate.getUTCDate()).padStart(2, '0')}.${String(future2hDate.getUTCMonth() + 1).padStart(2, '0')}.${future2hDate.getUTCFullYear()} ${String(future2hDate.getUTCHours()).padStart(2, '0')}:${String(future2hDate.getUTCMinutes()).padStart(2, '0')}`;

  mockSheetData['Даты ежедневных игр'] = [
    ['Дата', 'Сезон', 'Завершено', 'Всего игроков', 'Банк', 'Стоимость', 'Вес', 'Уведомление', 'Статус', 'Уведомлено отсутствующих', 'Описание', '11', '12', '13', 'Фото', 'Что будет', 'Уведомление за 12ч', 'Уведомление за 2ч'],
    ['01.01.2020 19:00:00', 'Сезон 1', 'Нет', '0', '3000', '3000', '1', '✓', 'Нормальный', 'Нет', '', '', '', '', '', '', '', ''],
    [future2hStr, 'Сезон 1', 'Нет', '0', '3000', '3000', '1', '✓', 'Нормальный', 'Нет', '', '', '', '', '', '', '✓', ''],
  ];

  const invRes = await sendGameInvitations();
  const pastCol17Update = updatedCells.find((c) => c.sheetName === 'Даты ежедневных игр' && c.row === 2 && c.col === 17 && c.val === '✓');
  const future2hCol18Update = updatedCells.find((c) => c.sheetName === 'Даты ежедневных игр' && c.row === 3 && c.col === 18 && c.val === '✓');

  if (!pastCol17Update || !future2hCol18Update) {
    throw new Error(`Expected row 2 12h (col 17) and row 3 2h (col 18) to be marked '✓'. Got updates: ${JSON.stringify(updatedCells)}`);
  }
  console.log('✅ Test 7 Passed: Game invitation 12h past window & 2h window flags automatically marked as "✓"!');

  // --- Test 8: Date Equality Matching in googleSheets ---
  console.log('\n--- Test 8: Date Equality Matching ---');
  if (!isDateEqual('25.10.2025 19:00', '25.10.2025 19:00:00')) {
    throw new Error('isDateEqual failed for string date with/without seconds');
  }
  if (!isDateEqual('2025-10-25T19:00:00.000Z', '25.10.2025 19:00')) {
    throw new Error('isDateEqual failed for ISO vs Russian date format');
  }
  console.log('✅ Test 8 Passed: Date equality comparison supports various date formats!');

  console.log('\n🎉 ALL NOTIFICATIONS TESTS PASSED SUCCESSFULLY!');
}

runNotificationsTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
