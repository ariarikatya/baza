import { isExited, isGameFinished } from '../lib/calculations';
import { DailyGameRow } from '../types';

function getDisplayPlace(row: DailyGameRow): string {
  const finished = isGameFinished(row);
  const placeVal = String(row['Место'] || '').trim();
  if (finished && placeVal && placeVal !== '-' && Number(placeVal) > 0) {
    return `#${placeVal}`;
  }
  if (isExited(row)) {
    return 'Вышел';
  }
  return 'В игре';
}

function runTests() {
  console.log('🧪 Running DailyGameRow status and helper tests...\n');

  const testCases: Array<{
    name: string;
    row: DailyGameRow;
    expectedExited: boolean;
    expectedFinished: boolean;
    expectedDisplayPlace: string;
  }> = [
    {
      name: '1. Place is filled (1), not exited',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': 1, 'Вышел?': false },
      expectedExited: false,
      expectedFinished: true,
      expectedDisplayPlace: '#1',
    },
    {
      name: '2. Place empty, Exited = "TRUE" string',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '', 'Вышел?': 'TRUE' },
      expectedExited: true,
      expectedFinished: true,
      expectedDisplayPlace: 'Вышел',
    },
    {
      name: '3. Place empty, Exited empty string',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '', 'Вышел?': '' },
      expectedExited: false,
      expectedFinished: false,
      expectedDisplayPlace: 'В игре',
    },
    {
      name: '4. Place "-", Exited = "FALSE" string',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '-', 'Вышел?': 'FALSE' },
      expectedExited: false,
      expectedFinished: false,
      expectedDisplayPlace: 'В игре',
    },
    {
      name: '5. Place "-", Exited = "Да" Russian string',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '-', 'Вышел?': 'Да' },
      expectedExited: true,
      expectedFinished: true,
      expectedDisplayPlace: 'Вышел',
    },
    {
      name: '6. Place "3", Exited = "✓" checkmark',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '3', 'Вышел?': '✓' },
      expectedExited: true,
      expectedFinished: true,
      expectedDisplayPlace: '#3',
    },
    {
      name: '7. Place empty, Exited = "0" (not exited)',
      row: { 'Дата': '01.01.2025 19:00', 'Ник': 'TestPlayer', 'Место': '', 'Вышел?': '0' },
      expectedExited: false,
      expectedFinished: false,
      expectedDisplayPlace: 'В игре',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const actualExited = isExited(tc.row);
    const actualFinished = isGameFinished(tc.row);
    const actualDisplay = getDisplayPlace(tc.row);

    const matchExited = actualExited === tc.expectedExited;
    const matchFinished = actualFinished === tc.expectedFinished;
    const matchDisplay = actualDisplay === tc.expectedDisplayPlace;

    if (matchExited && matchFinished && matchDisplay) {
      console.log(`✅ [PASS] ${tc.name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${tc.name}`);
      if (!matchExited) console.error(`   Exited: expected ${tc.expectedExited}, got ${actualExited}`);
      if (!matchFinished) console.error(`   Finished: expected ${tc.expectedFinished}, got ${actualFinished}`);
      if (!matchDisplay) console.error(`   Display: expected "${tc.expectedDisplayPlace}", got "${actualDisplay}"`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
