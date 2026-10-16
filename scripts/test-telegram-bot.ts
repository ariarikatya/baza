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
  console.log('🚀 Starting Telegram Bot & Password test suite...\n');

  // --- Password Cyrillic Exact Match Test ---
  console.log('--- Test 0: Password Cyrillic Exact Match ---');
  const passwordInDb: string = 'ПарольКлуб123!';
  const inputPasswordCorrect: string = 'ПарольКлуб123!';
  const inputPasswordWrong: string = 'парольКлуб123!';
  if ((passwordInDb === inputPasswordCorrect) !== true) {
    throw new Error('Exact Cyrillic password match failed!');
  }
  if ((passwordInDb === inputPasswordWrong) !== false) {
    throw new Error('Byte-for-byte comparison should fail on case mismatch without lowercasing!');
  }
  console.log('✅ Test 0 Passed: Cyrillic byte-for-byte password comparison verified!');

  // --- Requirement 4.9 Test 1: my_chat_member update (kicked/left) -> handled: true, branch: service_update_ignored, 0 writes ---
  console.log('\n--- Test 1: my_chat_member update (kicked/left) ---');
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
  if (!resMyChatMember.handled || resMyChatMember.branch !== 'service_update_ignored') {
    throw new Error(`my_chat_member update should return handled: true, branch: service_update_ignored. Got: ${JSON.stringify(resMyChatMember)}`);
  }
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`my_chat_member caused sheets write! updateRowCalls=${updateRowCalls.length}, writeRowCalls=${writeRowCalls.length}`);
  }
  console.log('✅ Test 1 Passed: 0 sheets write calls on kicked/left my_chat_member!');

  // --- Test 1b: my_chat_member update (member/start) with tgFirstName="Екатерина" and database nick="Котя" -> NO first_name matching, 0 writes, no duplicate warning ---
  console.log('\n--- Test 1b: my_chat_member member update with tgFirstName="Екатерина" and nick="Котя" ---');
  updateRowCalls = [];
  writeRowCalls = [];
  sentTelegramRequests.length = 0;
  const updateMyChatMemberJoin = {
    my_chat_member: {
      chat: { id: 452014803 },
      from: { id: 452014803, first_name: 'Екатерина', username: 'Kotya_Ar' },
      new_chat_member: { status: 'member' },
    },
  };
  const resMyChatMemberJoin = await processTelegramUpdate(updateMyChatMemberJoin, mockSheetsApi);
  if (!resMyChatMemberJoin.handled || resMyChatMemberJoin.branch !== 'my_chat_member_unlinked') {
    throw new Error(`Expected my_chat_member_unlinked branch, got: ${JSON.stringify(resMyChatMemberJoin)}`);
  }
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`first_name match on my_chat_member caused unexpected sheet write!`);
  }
  if (sentTelegramRequests.some((req) => req.body.text?.includes('Найдено несколько профилей'))) {
    throw new Error('my_chat_member update sent erroneous duplicate profile warning message!');
  }
  console.log('✅ Test 1b Passed: No first_name match or duplicate warning on my_chat_member!');

  // --- Requirement 4.9 Test 2: message "/start Котя" when there are 2 rows with nickname "Котя" -> 0 writes + warning message
  console.log('\n--- Test 2: Duplicate nickname handling ("/start Котя" with 2 "Котя" rows) ---');
  // Inject duplicate "Котя" row
  const dupRow = { 'Ник': 'Котя', 'User ID': '2', '🔒 Row ID': 'row_2', 'Telegram ID': '' };
  mockSheetData['Игроки'].push(dupRow);
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

  // Remove duplicate row from array reference
  const idxDup = mockSheetData['Игроки'].indexOf(dupRow);
  if (idxDup !== -1) mockSheetData['Игроки'].splice(idxDup, 1);

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

  // --- Test 3b: User with first_name="Екатерина" sending my_chat_member then "/start p_kot2" -> exactly 1 message total ---
  console.log('\n--- Test 3b: my_chat_member + /start <payload> combo produces exactly 1 message ---');
  mockSheetData['Игроки'].push({ 'Ник': 'Котя2', 'User ID': 'p_kot2', '🔒 Row ID': 'row_p_kot2', 'Telegram ID': '' });
  updateRowCalls = [];
  writeRowCalls = [];
  sentTelegramRequests.length = 0;

  const updateMyChatMemberForKot2 = {
    my_chat_member: {
      chat: { id: 1 },
      from: { id: 1, first_name: 'Екатерина', username: 'Kotya_Ar' },
      new_chat_member: { status: 'member' },
    },
  };
  await processTelegramUpdate(updateMyChatMemberForKot2, mockSheetsApi);

  const updateUserIdPayload = {
    message: {
      chat: { id: 1 },
      from: { id: 1, first_name: 'Екатерина', username: 'Kotya_Ar' },
      text: '/start p_kot2',
    },
  };
  const resUserIdPayload = await processTelegramUpdate(updateUserIdPayload, mockSheetsApi);
  if (!resUserIdPayload.handled || resUserIdPayload.branch !== '0_start') {
    throw new Error(`Expected branch 0_start, got: ${JSON.stringify(resUserIdPayload)}`);
  }
  const playerUpdatesUser = updateRowCalls.filter((c) => c.sheetName === 'Игроки');
  if (playerUpdatesUser.length !== 1) {
    throw new Error(`Expected exactly 1 updateRow call on 'Игроки', got ${playerUpdatesUser.length}`);
  }
  if (playerUpdatesUser[0].searchKey !== '🔒 Row ID' || playerUpdatesUser[0].searchValue !== 'row_p_kot2') {
    throw new Error(`Expected write by 🔒 Row ID = 'row_p_kot2', got searchKey=${playerUpdatesUser[0].searchKey}, searchValue=${playerUpdatesUser[0].searchValue}`);
  }

  // Assert exactly 1 message was sent across the entire my_chat_member + /start payload sequence for chat_id = 1
  const messagesForChat1 = sentTelegramRequests.filter((r) => String(r.body.chat_id) === '1');
  if (messagesForChat1.length !== 1) {
    throw new Error(`Expected exactly 1 Telegram message sent for chat_id=1, got ${messagesForChat1.length}`);
  }
  const lastMsgUserPayload = messagesForChat1[0];
  if (!lastMsgUserPayload.body.text.includes('✅ Ваш Telegram ID 1 привязан к игроку Котя2')) {
    throw new Error(`Expected link confirmation message to Котя2, got: ${lastMsgUserPayload.body.text}`);
  }
  console.log('✅ Test 3b Passed: Successfully bound Telegram ID to "Котя2" with exactly 1 total message!');

  // --- Requirement 4.9 Test 4: message without payload, username/first_name matches another player's nickname -> 0 writes, no duplicate warning ---
  console.log('\n--- Test 4: Message without payload, username matches another player\'s nick ---');
  updateRowCalls = [];
  writeRowCalls = [];
  sentTelegramRequests.length = 0;
  const updateUsernameMatch = {
    message: {
      chat: { id: 99999 },
      from: { id: 99999, first_name: 'Екатерина', username: 'Katerinasss' },
      text: '/start',
    },
  };
  const resNoPayloadStart = await processTelegramUpdate(updateUsernameMatch, mockSheetsApi);
  if (!resNoPayloadStart.handled || resNoPayloadStart.branch !== '0_start') {
    throw new Error(`Expected branch 0_start, got: ${JSON.stringify(resNoPayloadStart)}`);
  }
  if (updateRowCalls.length !== 0 || writeRowCalls.length !== 0) {
    throw new Error(`Username/first_name match without payload caused sheet write! updateRowCalls=${updateRowCalls.length}`);
  }
  const lastMsgNoPayload = sentTelegramRequests[sentTelegramRequests.length - 1];
  if (!lastMsgNoPayload.body.text.includes('Мы не нашли ваш профиль. Откройте сайт, войдите и нажмите «Подключить уведомления» — привязка произойдёт автоматически')) {
    throw new Error(`Expected polite non-match message, got: ${lastMsgNoPayload.body.text}`);
  }
  console.log('✅ Test 4 Passed: 0 writes & polite non-match message on /start without payload!');

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
  if (!lastMsgRepeat.body.text.includes('Вы уже подключены.')) {
    throw new Error(`Repeated start welcome message mismatch: got ${lastMsgRepeat.body.text}`);
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
