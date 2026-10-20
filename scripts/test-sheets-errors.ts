import { formatGoogleApiError } from '../lib/googleSheets';

function runSheetsErrorTests() {
  console.log('🧪 Running Google Sheets API Error Formatter Tests...\n');

  const testCases = [
    {
      name: '1. Mock 403 Permission Denied Error',
      err: { code: 403, message: 'The caller does not have permission' },
      expectedSubstring: '403 Permission Denied',
    },
    {
      name: '2. Mock 404 Sheet Not Found Error',
      err: { code: 404, message: 'Requested entity was not found' },
      expectedSubstring: '404 Not Found',
    },
    {
      name: '3. Mock 429 Rate Limit Error',
      err: { code: 429, message: 'Quota exceeded for quota metric' },
      expectedSubstring: '429 Rate Limit',
    },
    {
      name: '4. Mock Generic Error',
      err: { message: 'Network connection reset' },
      expectedSubstring: 'Network connection reset',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const formatted = formatGoogleApiError(tc.err);
    if (formatted.includes(tc.expectedSubstring)) {
      console.log(`✅ [PASS] ${tc.name} -> "${formatted}"`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${tc.name}`);
      console.error(`   Expected substring: "${tc.expectedSubstring}"`);
      console.error(`   Got: "${formatted}"`);
      failed++;
    }
  }

  console.log(`\n📊 Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runSheetsErrorTests();
