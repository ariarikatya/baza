import { processTelegramUpdate, linkTelegramId, SheetsService } from '../lib/telegramBot';

process.env.TELEGRAM_BOT_TOKEN = '8159179687:AAEVkVIxP_p86uHMghhF8WBb9FqdAGoeuos';

const mockSheetData: Record<string, any[]> = {
  'Игроки': [
    { 'Ник': 'TestPlayer', 'User ID': 'p_999888', '🔒 Row ID': 'row_p_999888', 'Telegram ID': '12345', 'QR URL': 'https://example.com/qr.png', 'Статус': '⭐ ЗОЛОТОЙ ИГРОК', 'Рейтинг': '150', 'Место': '3' },
    { 'Ник': 'Котя', 'User ID': '1', '🔒 Row ID': 'row_1', 'Telegram ID': '' },
    { 'Ник': 'Katerinasss', 'User ID': 'p_kat', '🔒 Row ID': 'row_kat', 'Telegram ID': '' },
  ],
  'В клубе': [
    { 'Telegram ID': '12345', 'Ник': 'TestPlayer', 'Статус': 'В клубе' },
    { 'Telegram ID': '', 'Ник': 'Котя', 'Статус': 'Ожидает' },
  ],
  'Даты ежедневных игр': [
    { 'Дата и Время': '25.12.2030 19:00', 'Сезонный турнир': 'Сезон 2030', 'Стоимость': '1000' },
  ],
  'Сезонные турниры': [
    { 'Завершить турнир': 'false', 'Завершено': 0 },
  ],
  '🎮 ЕЖЕДНЕВНЫЕ ИГРЫ': [],
};

let updateRowCalls: { sheetName: string; searchKey: string; searchValue: string; updatedFields: Record<string, any> }[] = [];
let writeRowCalls: { sheetName: string; rowData: Record<string, any> }[] = [];

const mockSheetsApi: SheetsService = {
  readSheet: async (sheetName: string) => {
    return mockSheetData[sheetName] || [];
  },
  updateRow: async (sheetName: string, searchKey: string, searchValue: string, updatedFields: Record<string, any>) => {
    updateRowCalls.push({ sheetName, searchKey, searchValue, updatedFields });
    const list = mockSheetData[sheetName] || [];
    const item = list.find((r) => String(r[searchKey]).trim().toLowerCase() === String(searchValue).trim().toLowerCase());
    if (item) {
      Object.assign(item, updatedFields);
      return true;
    }
    return false;
  },
  writeRow: async (sheetName: string, rowData: Record<string, any>) => {
    writeRowCalls.push({ sheetName, rowData });
    if (!mockSheetData[sheetName]) mockSheetData[sheetName] = [];
    mockSheetData[sheetName].push(rowData);
    return true;
  },
};

const sentTelegramRequests: { url: string; body: any }[] = [];
global.fetch = async (url: any, options: any) => {
  const body = options?.body ? JSON.parse(options.body) : {};
  sentTelegramRequests.push({ url: String(url), body });
  return {
    json: async () => ({ ok: true, result: {} }),
  } as any;
};

async function runTests() {
  console.log('🚀 Starting Telegram Bot test suite...\n');

  // --- Requirement 4.9 Test 1: my_chat_member update -> 0 calls to updateRow/writeRow
  console.log('--- Test 1: my_chat_member update (kicked/left) ---');
  updateRowCalls = [];
  writeRowCalls = [];
  const updateMyChatMember = {
    my_chat_member: {
      chat: { id: 12345 },
      from: { id: 12345, username: 'TestPlayer' },
      new_chat_member: { status: 'kicked' },
    },
  };
  const resMyChatMember = await processTelegramUpdate(updateMyChatMember, mockSheetsApi);
  if (resMyChatMember.handled !== false) {
    throw new Error('my_chat_member update should return handled: false');
  }
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`my_chat_member caused sheets write! updateRowCalls=${updateRowCalls.length}, writeRowCalls=${writeRowCalls.length}`);
  }
  console.log('✅ Test 1 Passed: 0 sheets write calls on my_chat_member!');

  // --- Requirement 4.9 Test 2: message "/start Котя" when there are 2 rows with nickname "Котя" -> 0 writes + warning message
  console.log('\n--- Test 2: Duplicate nickname handling ("/start Котя" with 2 "Котя" rows) ---');
  // Inject duplicate "Котя" row
  mockSheetData['Игроки'].push({ 'Ник': 'Котя', 'User ID': '2', '🔒 Row ID': 'row_2', 'Telegram ID': '' });
  updateRowCalls = [];
  writeRowCalls = [];
  const updateDup = {
    message: {
      chat: { id: 88888 },
      from: { id: 88888 },
      text: '/start Котя',
    },
  };
  const resDup = await processTelegramUpdate(updateDup, mockSheetsApi);
  if (!resDup.handled || resDup.branch !== 'duplicate_conflict') {
    throw new Error(`Expected handled: true, branch: duplicate_conflict. Got: ${JSON.stringify(resDup)}`);
  }
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`Duplicate nickname resulted in sheet write! updateRowCalls=${updateRowCalls.length}`);
  }
  const lastMsgDup = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastMsgDup.body.text.includes('Найдено несколько профилей с таким ником, обратитесь к администратору')) {
    throw new Error('Duplicate warning message not sent to user');
  }
  console.log('✅ Test 2 Passed: 0 writes and warning sent on duplicate nickname!');

  // Remove duplicate row for remaining tests
  mockSheetData['Игроки'] = mockSheetData['Игроки'].filter((p) => p['User ID'] !== '2');

  // --- Requirement 4.9 Test 3: message "/start Котя" when unique -> exactly 1 write by Row ID / User ID
  console.log('\n--- Test 3: Unique "/start Котя" payload linking ---');
  updateRowCalls = [];
  writeRowCalls = [];
  const updateUnique = {
    message: {
      chat: { id: 77777 },
      from: { id: 77777 },
      text: '/start Котя',
    },
  };
  const resUnique = await processTelegramUpdate(updateUnique, mockSheetsApi);
  if (!resUnique.handled || resUnique.branch !== '0_start') {
    throw new Error(`Expected branch 0_start, got: ${JSON.stringify(resUnique)}`);
  }
  const playerUpdates = updateRowCalls.filter((c) => c.sheetName === 'Игроки');
  if (playerUpdates.length !== 1) {
    throw new Error(`Expected exactly 1 updateRow call on 'Игроки', got ${playerUpdates.length}`);
  }
  if (playerUpdates[0].searchKey !== '🔒 Row ID' || playerUpdates[0].searchValue !== 'row_1') {
    throw new Error(`Expected write by 🔒 Row ID = 'row_1', got searchKey=${playerUpdates[0].searchKey}, searchValue=${playerUpdates[0].searchValue}`);
  }
  console.log('✅ Test 3 Passed: Exactly 1 updateRow call by 🔒 Row ID!');

  // --- Requirement 4.9 Test 4: message without payload, username matches another player's nickname -> 0 writes
  console.log('\n--- Test 4: Message without payload, username matches another player\'s nick ---');
  updateRowCalls = [];
  writeRowCalls = [];
  const updateUsernameMatch = {
    message: {
      chat: { id: 99999 },
      from: { id: 99999, username: 'Katerinasss' }, // matches Katerinasss in Игроки
      text: 'Привет всем!',
    },
  };
  await processTelegramUpdate(updateUsernameMatch, mockSheetsApi);
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`Username match without payload caused sheet write! updateRowCalls=${updateRowCalls.length}`);
  }
  console.log('✅ Test 4 Passed: 0 writes on username match without payload!');

  // --- Requirement 4.9 Test 5: repeated "/start" with same telegram id -> idempotent, no duplicate write
  console.log('\n--- Test 5: Idempotent repeated "/start" with same Telegram ID ---');
  updateRowCalls = [];
  writeRowCalls = [];
  const updateRepeat = {
    message: {
      chat: { id: 77777 },
      from: { id: 77777 }, // Telegram ID 77777 was bound to Котя in Test 3
      text: '/start',
    },
  };
  const resRepeat = await processTelegramUpdate(updateRepeat, mockSheetsApi);
  if (!resRepeat.handled || resRepeat.branch !== '0_start') {
    throw new Error('Repeated start failed');
  }
  const newPlayerWrites = updateRowCalls.filter((c) => c.sheetName === 'Игроки');
  if (newPlayerWrites.length !== 0) {
    throw new Error(`Idempotent start caused re-write to 'Игроки'! updateRowCalls=${newPlayerWrites.length}`);
  }
  const lastMsgRepeat = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastMsgRepeat.body.text.includes('✅ Ваш Telegram ID 77777 привязан к игроку Котя')) {
    throw new Error('Repeated start welcome message mismatch');
  }
  console.log('✅ Test 5 Passed: Idempotent repeat /start caused 0 new writes!');

  // --- Testing Callbacks (app, qr, reg, rating)
  console.log('\n--- Test 6: Callbacks (app, qr, reg, rating) ---');
  const cbApp = { callback_query: { id: 'cb_1', from: { id: 12345 }, data: 'app' } };
  const resApp = await processTelegramUpdate(cbApp, mockSheetsApi);
  if (!resApp.handled || resApp.branch !== '2_app') throw new Error('Callback app failed');

  const cbQr = { callback_query: { id: 'cb_2', from: { id: 12345 }, data: 'qr' } };
  const resQr = await processTelegramUpdate(cbQr, mockSheetsApi);
  if (!resQr.handled || resQr.branch !== '3_qr') throw new Error('Callback qr failed');

  const cbReg = { callback_query: { id: 'cb_3', from: { id: 12345 }, data: 'reg' } };
  const resReg = await processTelegramUpdate(cbReg, mockSheetsApi);
  if (!resReg.handled || resReg.branch !== '4_reg') throw new Error('Callback reg failed');

  const cbRating = { callback_query: { id: 'cb_4', from: { id: 12345 }, data: 'rating' } };
  const resRating = await processTelegramUpdate(cbRating, mockSheetsApi);
  if (!resRating.handled || resRating.branch !== '5_rating') throw new Error('Callback rating failed');

  console.log('✅ Test 6 Passed: Callbacks working correctly!');

  console.log('\n🎉 ALL TELEGRAM BOT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
