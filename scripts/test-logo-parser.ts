import { DEFAULT_CLUB_LOGO, formatLogoUrl } from '../lib/clubSettings';

function runLogoParserTests() {
  console.log('🧪 Starting Club Logo Parser Unit Tests...');

  // Test Case 1: Markdown link
  const res1 = formatLogoUrl('[открыть](https://example.com/logo.png)');
  if (res1 === 'https://example.com/logo.png') {
    console.log('✅ Test 1 Passed: Markdown link extracted cleanly:', res1);
  } else {
    console.error('❌ Test 1 Failed: Expected https://example.com/logo.png but got:', res1);
    process.exit(1);
  }

  // Test Case 2: Direct HTTP URL
  const res2 = formatLogoUrl('https://storage.googleapis.com/baza/logo.jpg');
  if (res2 === 'https://storage.googleapis.com/baza/logo.jpg') {
    console.log('✅ Test 2 Passed: Direct URL extracted:', res2);
  } else {
    console.error('❌ Test 2 Failed: Expected bare URL but got:', res2);
    process.exit(1);
  }

  // Test Case 3: Google Drive file link
  const res3 = formatLogoUrl('https://drive.google.com/file/d/1ABC123xyz_456/view?usp=sharing');
  if (res3 === 'https://lh3.googleusercontent.com/d/1ABC123xyz_456') {
    console.log('✅ Test 3 Passed: Google Drive link converted:', res3);
  } else {
    console.error('❌ Test 3 Failed: Expected Google Drive direct link but got:', res3);
    process.exit(1);
  }

  // Test Case 4: Empty string
  const res4 = formatLogoUrl('');
  if (res4 === '') {
    console.log('✅ Test 4 Passed: Empty string handled correctly');
  } else {
    console.error('❌ Test 4 Failed: Expected empty string but got:', res4);
    process.exit(1);
  }

  console.log('🎉 ALL LOGO PARSER TESTS PASSED!');
}

runLogoParserTests();
