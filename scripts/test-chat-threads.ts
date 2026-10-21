import { groupChatThreads, buildPlayerIdentityMap } from '../lib/calculations';

function runChatThreadsTests() {
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
    // Message 3: Incomplete row (should trigger warning and be skipped)
    {
      'Отправитель': 'Алексей',
      'Сообщение': '',
      'Получатель': 'Сергей',
      'Дата и время отправки': '21.10.2026 10:10',
    },
  ];

  // Test 1: Check active threads for Player 1 (Алексей)
  const threadsForPlayer1 = groupChatThreads(messages, 'p1@baza.ru', 'Алексей', playersList, 'U001');
  if (threadsForPlayer1.length === 1 && threadsForPlayer1[0].partnerName === 'Владелец') {
    console.log('✅ Test 1 Passed: Recipient (Player 1) sees active thread with "Владелец":', threadsForPlayer1[0]);
  } else {
    console.error('❌ Test 1 Failed: Expected thread for "Владелец" but got:', threadsForPlayer1);
    process.exit(1);
  }

  // Test 2: Check active threads for Owner (Владелец)
  const threadsForOwner = groupChatThreads(messages, 'owner@baza.ru', 'Владелец', playersList, 'U000');
  if (threadsForOwner.length === 1 && threadsForOwner[0].partnerName === 'Алексей') {
    console.log('✅ Test 2 Passed: Sender (Owner) sees active thread with "Алексей":', threadsForOwner[0]);
  } else {
    console.error('❌ Test 2 Failed: Expected thread for "Алексей" but got:', threadsForOwner);
    process.exit(1);
  }

  // Test 3: Check lastMessage and sorting
  if (threadsForPlayer1[0].lastMessage === 'Спасибо, скоро буду на игре!') {
    console.log('✅ Test 3 Passed: Last message matches latest timestamp:', threadsForPlayer1[0].lastMessage);
  } else {
    console.error('❌ Test 3 Failed: Unexpected lastMessage:', threadsForPlayer1[0].lastMessage);
    process.exit(1);
  }

  console.log('🎉 ALL CHAT THREADS TESTS PASSED!');
}

runChatThreadsTests();
