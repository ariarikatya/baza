import { processTelegramUpdate, SheetsService } from '../lib/telegramBot';

// Set dummy token for test
process.env.TELEGRAM_BOT_TOKEN = '8159179687:AAEVkVIxP_p86uHMghhF8WBb9FqdAGoeuos';

// Mock storage
const mockSheetData: Record<string, any[]> = {
  'Игроки': [
    { 'Ник': 'TestPlayer', 'User ID': '999888', 'Telegram ID': '12345', 'QR URL': 'https://example.com/qr.png', 'Статус': '⭐ ЗОЛОТОЙ ИГРОК', 'Рейтинг': '150', 'Место': '3' },
  ],
  'В клубе': [
    { 'Telegram ID': '12345', 'Ник': 'TestPlayer', 'Статус': 'В клубе' },
  ],
  'Даты ежедневных игр': [
    { 'Дата и Время': '25.12.2030 19:00', 'Сезонный турнир': 'Сезон 2030', 'Стоимость': '1000' },
  ],
  'Сезонные турниры': [
    { 'Завершить турнир': 'false', 'Завершено': 0 },
  ],
  '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ': [],
};

const mockSheetsApi: SheetsService = {
  readSheet: async (sheetName: string) => {
    return mockSheetData[sheetName] || [];
  },
  updateRow: async (sheetName: string, searchKey: string, searchValue: string, updatedFields: Record<string, any>) => {
    const list = mockSheetData[sheetName] || [];
    const item = list.find((r) => String(r[searchKey]).trim() === String(searchValue).trim());
    if (item) {
      Object.assign(item, updatedFields);
      return true;
    }
    return false;
  },
  writeRow: async (sheetName: string, rowData: Record<string, any>) => {
    if (!mockSheetData[sheetName]) mockSheetData[sheetName] = [];
    mockSheetData[sheetName].push(rowData);
    return true;
  },
};

// Mock fetch for Telegram API
const sentTelegramRequests: { url: string; body: any }[] = [];
global.fetch = async (url: any, options: any) => {
  const body = options?.body ? JSON.parse(options.body) : {};
  sentTelegramRequests.push({ url: String(url), body });
  return {
    json: async () => ({ ok: true, result: {} }),
  } as any;
};

async function runTests() {
  console.log('🚀 Starting Telegram Bot updates test...\n');

  // Test Branch 0 (Deep link /start)
  console.log('--- Testing Branch 0 (Deep link /start %D0%9A%D0%BE%D1%82%D1%8F) ---');
  const update0 = {
    message: {
      chat: { id: 77777 },
      text: '/start %D0%9A%D0%BE%D1%82%D1%8F',
    },
  };
  const res0 = await processTelegramUpdate(update0, mockSheetsApi);
  console.log('Result Branch 0:', res0);
  if (!res0.handled || res0.branch !== '0_start') throw new Error('Branch 0 failed');
  const lastReq0 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastReq0.body.text.includes('✅ Ваш Telegram ID 77777 привязан к игроку Котя')) throw new Error('Branch 0 deep link text mismatch');
  const players = mockSheetData['Игроки'];
  const kotyaPlayer = players.find((p) => p['Ник'] === 'Котя');
  if (!kotyaPlayer || String(kotyaPlayer['Telegram ID']) !== '77777') throw new Error('Branch 0 failed to record Telegram ID for Котя');
  console.log('✅ Branch 0 Passed!');

  // Test Branch 1
  console.log('--- Testing Branch 1 (Registration by User ID) ---');
  const update1 = {
    message: {
      chat: { id: 12345 },
      text: 'Мой код авторизации User ID: 999888',
    },
  };
  const res1 = await processTelegramUpdate(update1, mockSheetsApi);
  console.log('Result Branch 1:', res1);
  if (!res1.handled || res1.branch !== '1_registration') throw new Error('Branch 1 failed');
  const lastReq1 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastReq1.body.text.includes('Правовая информация')) throw new Error('Branch 1 text mismatch');
  console.log('✅ Branch 1 Passed!');

  // Test Branch 2
  console.log('\n--- Testing Branch 2 (Callback "app") ---');
  const update2 = {
    callback_query: {
      id: 'cb_app_1',
      from: { id: 12345 },
      data: 'app',
    },
  };
  const res2 = await processTelegramUpdate(update2, mockSheetsApi);
  console.log('Result Branch 2:', res2);
  if (!res2.handled || res2.branch !== '2_app') throw new Error('Branch 2 failed');
  const lastReq2 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastReq2.body.text.includes('https://baza64.glide.page')) throw new Error('Branch 2 text mismatch');
  console.log('✅ Branch 2 Passed!');

  // Test Branch 3
  console.log('\n--- Testing Branch 3 (Callback "qr") ---');
  const update3 = {
    callback_query: {
      id: 'cb_qr_1',
      from: { id: 12345 },
      data: 'qr',
    },
  };
  const res3 = await processTelegramUpdate(update3, mockSheetsApi);
  console.log('Result Branch 3:', res3);
  if (!res3.handled || res3.branch !== '3_qr') throw new Error('Branch 3 failed');
  const lastReq3 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (lastReq3.body.photo !== 'https://example.com/qr.png') throw new Error('Branch 3 photo URL mismatch');
  console.log('✅ Branch 3 Passed!');

  // Test Branch 4
  console.log('\n--- Testing Branch 4 (Callback "reg") ---');
  const update4 = {
    callback_query: {
      id: 'cb_reg_1',
      from: { id: 12345 },
      data: 'reg',
    },
  };
  const res4 = await processTelegramUpdate(update4, mockSheetsApi);
  console.log('Result Branch 4:', res4);
  if (!res4.handled || res4.branch !== '4_reg') throw new Error('Branch 4 failed');
  const dailyGames = mockSheetData['🎮 ЕЖЕДНЕВНЫЕ ИГРЫ'];
  if (dailyGames.length === 0 || dailyGames[0]['Ник'] !== 'TestPlayer') throw new Error('Branch 4 daily games registration failed');
  const lastReq4 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastReq4.body.text.includes('Вы зарегистрированы на игру 25.12.2030 19:00')) throw new Error('Branch 4 confirmation text mismatch');
  console.log('✅ Branch 4 Passed!');

  // Test Branch 5
  console.log('\n--- Testing Branch 5 (Callback "rating") ---');
  const update5 = {
    callback_query: {
      id: 'cb_rating_1',
      from: { id: 12345 },
      data: 'rating',
    },
  };
  const res5 = await processTelegramUpdate(update5, mockSheetsApi);
  console.log('Result Branch 5:', res5);
  if (!res5.handled || res5.branch !== '5_rating') throw new Error('Branch 5 failed');
  const lastReq5 = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastReq5.body.text.includes('Ник: TestPlayer') || !lastReq5.body.text.includes('Рейтинг: 150')) throw new Error('Branch 5 text mismatch');
  console.log('✅ Branch 5 Passed!');

  console.log('\n🎉 ALL 5 TELEGRAM BOT BRANCHES PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
