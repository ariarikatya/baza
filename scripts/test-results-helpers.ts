import { isExited, isGameFinished } from '../lib/calculations';

function runTests() {
  console.log('🧪 Running tests for results helpers (isExited & isGameFinished)...\n');

  let passed = 0;
  let failed = 0;

  function assertEqual(actual: boolean, expected: boolean, description: string) {
    if (actual === expected) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description} | Expected: ${expected}, Got: ${actual}`);
      failed++;
    }
  }

  // Test cases for isExited
  console.log('--- Testing isExited ---');
  assertEqual(isExited({ 'Вышел?': true }), true, "Explicit boolean true");
  assertEqual(isExited({ 'Вышел?': 'true' }), true, "String 'true'");
  assertEqual(isExited({ 'Вышел?': 'TRUE' }), true, "String 'TRUE'");
  assertEqual(isExited({ 'Вышел?': 'Да' }), true, "String 'Да'");
  assertEqual(isExited({ 'Вышел?': '1' }), true, "String '1'");
  assertEqual(isExited({ 'Вышел?': '✓' }), true, "Checkmark symbol '✓'");
  assertEqual(isExited({ 'Вышел?': false }), false, "Explicit boolean false");
  assertEqual(isExited({ 'Вышел?': 'false' }), false, "String 'false'");
  assertEqual(isExited({ 'Вышел?': '' }), false, "Empty string");
  assertEqual(isExited({ 'Вышел?': 'Нет' }), false, "String 'Нет'");

  // Test cases for isGameFinished
  console.log('\n--- Testing isGameFinished ---');
  assertEqual(isGameFinished({ 'Место': '1', 'Вышел?': 'false' }), true, "Place filled (1)");
  assertEqual(isGameFinished({ 'Место': 3, 'Вышел?': false }), true, "Place filled (3 as number)");
  assertEqual(isGameFinished({ 'Место': '-', 'Вышел?': 'true' }), true, "Place '-' but Вышел?='true'");
  assertEqual(isGameFinished({ 'Место': '', 'Вышел?': 'Да' }), true, "Place '' but Вышел?='Да'");
  assertEqual(isGameFinished({ 'Место': '', 'Вышел?': '' }), false, "Place '' and Вышел?=''");
  assertEqual(isGameFinished({ 'Место': '-', 'Вышел?': 'false' }), false, "Place '-' and Вышел?='false'");
  assertEqual(isGameFinished({ 'Место': '0', 'Вышел?': 'false' }), false, "Place '0' and Вышел?='false'");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
