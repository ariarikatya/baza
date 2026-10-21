import { groupChatThreads, buildPlayerIdentityMap, isMessageInThread } from '../lib/calculations';
import { getCanonicalSheetTitle, resolveChatSheetName } from '../lib/googleSheets';

async function runChatThreadsTests() {
  console.log('🧪 Starting Chat Threads Unit Tests...');

  const playersList = [
    {
      'Ник': 'Владелец',
      'Email': 'owner@baza.ru',
      'User ID': 'U000',
      '🔒 Row ID': 'R000',
      'Роль': 'Владелец',
    },
    {
      'Ник': 'Алексей',
      'Email': 'p1@baza.ru',
      'User ID': 'U001',
      '🔒 Row ID': 'R001',
      'Роль': '',
    },
    {
      'Ник': 'Сергей',
      'Email': 'sergey@baza.ru',
      'User ID': 'U002',
      '🔒 Row ID': 'R002',
      'Роль': 'Админ',
    },
  ];

  const messages = [
    // Message 1: Owner writes to Player 1 using Player 1's email "p1@baza.ru" in Column C
    {
      'Отправитель': 'Владелец',
      'Сообщение': 'Привет, Алексей! Добро пожаловать в клуб.',
      'Получатель': 'p1@baza.ru',
      'Дата и время отправки': '21.10.2026 10:00',
    },
    // Message 2: Player 1 replies to Owner using Owner's nick "Владелец"
    {
      'Отправитель': 'Алексей',
      'Сообщение': 'Спасибо, скоро буду на игре!',
      'Получатель': 'Владелец',
      'Дата и время отправки': '21.10.2026 10:05',
    },
    // Message 3: Empty text message from Алексей to Сергей (should create thread showing "Диалог")
    {
      'Отправитель': 'Алексей',
      'Сообщение': '',
      'Получатель': 'Сергей',
      'Дата и время отправки': '21.10.2026 10:10',
    },
  ];

  // Test 1: Check active threads for Player 1 (Алексей) - sees both "Владелец" and "Сергей"
  const threadsForPlayer1 = groupChatThreads(messages, 'p1@baza.ru', 'Алексей', playersList, 'U001');
  const ownerThreadForPlayer1 = threadsForPlayer1.find((t) => t.partnerName === 'Владелец');
  const sergeyThreadForPlayer1 = threadsForPlayer1.find((t) => t.partnerName === 'Сергей');

  if (ownerThreadForPlayer1 && ownerThreadForPlayer1.lastMessage === 'Спасибо, скоро буду на игре!') {
    console.log('✅ Test 1 Passed: Recipient (Player 1) sees active thread with "Владелец":', ownerThreadForPlayer1);
  } else {
    console.error('❌ Test 1 Failed: Expected thread for "Владелец" but got:', threadsForPlayer1);
    process.exit(1);
  }

  if (sergeyThreadForPlayer1 && sergeyThreadForPlayer1.lastMessage === 'Диалог') {
    console.log('✅ Test 1b Passed: Empty message text displays default "Диалог":', sergeyThreadForPlayer1);
  } else {
    console.error('❌ Test 1b Failed: Expected "Диалог" for empty text but got:', sergeyThreadForPlayer1);
    process.exit(1);
  }

  // Test 2: Check active threads for Owner (Владелец) - sees "Алексей"
  const threadsForOwner = groupChatThreads(messages, 'owner@baza.ru', 'Владелец', playersList, 'U000');
  const alexeyThreadForOwner = threadsForOwner.find((t) => t.partnerName === 'Алексей');
  if (alexeyThreadForOwner && alexeyThreadForOwner.lastMessage === 'Спасибо, скоро буду на игре!') {
    console.log('✅ Test 2 Passed: Sender (Owner) sees active thread with "Алексей":', alexeyThreadForOwner);
  } else {
    console.error('❌ Test 2 Failed: Expected thread for "Алексей" but got:', threadsForOwner);
    process.exit(1);
  }

  // Test 3: Owner writes directly to Player X (Алексей) in A->C, Player X sees active thread
  const ownerToPlayerXMsg = [
    {
      'Отправитель': 'Владелец',
      'Сообщение': 'Личное сообщение игроку X',
      'Получатель': 'Алексей',
      'Дата и время отправки': '21.10.2026 12:00',
    },
  ];
  const threadsX = groupChatThreads(ownerToPlayerXMsg, 'p1@baza.ru', 'Алексей', playersList, 'U001');
  if (threadsX.length === 1 && threadsX[0].partnerName === 'Владелец' && threadsX[0].lastMessage === 'Личное сообщение игроку X') {
    console.log('✅ Test 3 Passed: Player X sees active thread when Owner writes in A->C:', threadsX[0]);
  } else {
    console.error('❌ Test 3 Failed: Expected active thread for Player X but got:', threadsX);
    process.exit(1);
  }

  // Test 4: isMessageInThread helper tests
  const myKeysForAlexey = new Set(['алексей', 'p1@baza.ru', 'u001']);
  const partnerKeysForOwner = new Set(['владелец', 'owner@baza.ru', 'u000']);

  // Case (а): Owner -> Player X
  const msgOwnerToX = { 'Отправитель': 'Владелец', 'Получатель': 'Алексей', 'Сообщение': 'Привет' };
  if (isMessageInThread(msgOwnerToX, myKeysForAlexey, partnerKeysForOwner)) {
    console.log('✅ Test 4a Passed: isMessageInThread returns true for Owner -> Player X');
  } else {
    console.error('❌ Test 4a Failed: Expected true for Owner -> Player X');
    process.exit(1);
  }

  // Case (б): Player X -> Owner
  const msgXToOwner = { 'Отправитель': 'Алексей', 'Получатель': 'Владелец', 'Сообщение': 'Ответ' };
  if (isMessageInThread(msgXToOwner, myKeysForAlexey, partnerKeysForOwner)) {
    console.log('✅ Test 4b Passed: isMessageInThread returns true for Player X -> Owner');
  } else {
    console.error('❌ Test 4b Failed: Expected true for Player X -> Owner');
    process.exit(1);
  }

  // Case (в): Column C contains email
  const msgWithEmail = { 'Отправитель': 'Владелец', 'Получатель': 'p1@baza.ru', 'Сообщение': 'По почте' };
  if (isMessageInThread(msgWithEmail, myKeysForAlexey, partnerKeysForOwner)) {
    console.log('✅ Test 4c Passed: isMessageInThread returns true when Column C contains email');
  } else {
    console.error('❌ Test 4c Failed: Expected true when Column C contains email');
    process.exit(1);
  }

  // Case (г): Empty text with photo
  const msgEmptyTextWithPhoto = { 'Отправитель': 'Владелец', 'Получатель': 'Алексей', 'Сообщение': '', 'Игрок фото': 'http://image.png' };
  if (isMessageInThread(msgEmptyTextWithPhoto, myKeysForAlexey, partnerKeysForOwner)) {
    console.log('✅ Test 4d Passed: isMessageInThread returns true for empty message text with photo');
  } else {
    console.error('❌ Test 4d Failed: Expected true for empty message text with photo');
    process.exit(1);
  }

  // Test 5: Mock sheets.spreadsheets.get returning sheet named 'Чат'
  const mockSheets = {
    spreadsheets: {
      get: async () => ({
        data: {
          sheets: [
            { properties: { title: 'Игроки', sheetId: 0 } },
            { properties: { title: 'Чат', sheetId: 12345 } },
          ],
        },
      }),
    },
  };

  const resolvedSingular = await getCanonicalSheetTitle(mockSheets, 'dummy_id', 'Чат');
  const resolvedPlural = await getCanonicalSheetTitle(mockSheets, 'dummy_id', 'Чаты');
  const resolvedDirect = await resolveChatSheetName(mockSheets, 'dummy_id');

  if (
    resolvedSingular.title === 'Чат' &&
    resolvedPlural.title === 'Чат' &&
    resolvedDirect.title === 'Чат'
  ) {
    console.log('✅ Test 5 Passed: Both "Чат" and "Чаты" aliases stably resolve to single canonical sheet "Чат":', resolvedSingular);
  } else {
    console.error('❌ Test 5 Failed: Expected "Чат" for both aliases, got:', { resolvedSingular, resolvedPlural, resolvedDirect });
    process.exit(1);
  }

  console.log('🎉 ALL CHAT THREADS TESTS PASSED!');
}

runChatThreadsTests();
