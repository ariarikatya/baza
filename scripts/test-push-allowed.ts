import assert from 'assert';
import { isPushAllowedClient, getWebPushFlagClient } from '../lib/webPushClient';

console.log('🧪 Testing isPushAllowedClient with various Google Sheets flag values...\n');

const allowedValues = [
  'разрешено',
  'Разрешено',
  'РАЗРЕШЕНО',
  '  разрешено  ',
  '✓ разрешено',
  '✅ разрешено',
  '✓',
  '✅',
  'true',
  'TRUE',
  'True',
  'yes',
  'YES',
  'y',
  'да',
  'ДА',
  '1',
  'allowed',
  'enabled',
  'on',
  'Разрешено | {"endpoint":"https://fcm.googleapis.com/fcm/send/test"}',
  'разрешено|[{"endpoint":"https://example.com"}]',
  '[{"endpoint":"https://updates.push.services.mozilla.com/wpush/v2/test"}]',
  '{"endpoint":"https://example.com"}',
];

for (const val of allowedValues) {
  const player = { 'Веб-уведомления': val };
  const res = isPushAllowedClient(player);
  assert.strictEqual(res, true, `Expected "${val}" to be allowed, got ${res}`);
  console.log(`✅ [PASS] Allowed value: "${val.length > 40 ? val.slice(0, 37) + '...' : val}"`);
}

const disabledValues = [
  '',
  '   ',
  'запрещено',
  'Запрещено',
  'ЗАПРЕЩЕНО',
  'denied',
  'false',
  'FALSE',
  '0',
  'нет',
  'off',
  'disabled',
  'no',
  null,
  undefined,
];

for (const val of disabledValues) {
  const player = { 'Веб-уведомления': val };
  const res = isPushAllowedClient(player);
  assert.strictEqual(res, false, `Expected "${val}" to be disabled, got ${res}`);
  console.log(`✅ [PASS] Disabled value: "${val}"`);
}

console.log('\n📊 All push flag normalization tests passed successfully!');
