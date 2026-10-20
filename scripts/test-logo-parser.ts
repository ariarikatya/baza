import { DEFAULT_CLUB_LOGO } from '../lib/clubSettings';

// Helper function implementing the URL extraction logic from getClubLogoUrl()
function parseLogoUrlFromRows(rawRows: string[][]): string {
  if (rawRows && rawRows.length > 0) {
    for (let i = 0; i < rawRows.length; i++) {
      const rawCell = String(rawRows[i][0] || '').trim();
      if (rawCell && !rawCell.toLowerCase().includes('логотип')) {
        let cleanUrl = rawCell;
        const mdMatch = rawCell.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
        if (mdMatch) {
          cleanUrl = mdMatch[1];
        } else {
          const httpMatch = rawCell.match(/(https?:\/\/[^\s"'<>]+)/);
          if (httpMatch) {
            cleanUrl = httpMatch[1];
          }
        }

        if (cleanUrl && cleanUrl.startsWith('http')) {
          return cleanUrl;
        }
      }
    }
  }
  return DEFAULT_CLUB_LOGO;
}

function runLogoParserTests() {
  console.log('🧪 Starting Club Logo Parser Unit Tests...');

  // Test Case 1: Markdown link
  const markdownRows = [['Логотип'], ['[открыть](https://example.com/logo.png)']];
  const res1 = parseLogoUrlFromRows(markdownRows);
  if (res1 === 'https://example.com/logo.png') {
    console.log('✅ Test 1 Passed: Markdown link extracted cleanly:', res1);
  } else {
    console.error('❌ Test 1 Failed: Expected https://example.com/logo.png but got:', res1);
    process.exit(1);
  }

  // Test Case 2: Direct HTTP URL
  const bareUrlRows = [['Логотип'], ['https://storage.googleapis.com/baza/logo.jpg']];
  const res2 = parseLogoUrlFromRows(bareUrlRows);
  if (res2 === 'https://storage.googleapis.com/baza/logo.jpg') {
    console.log('✅ Test 2 Passed: Direct URL extracted:', res2);
  } else {
    console.error('❌ Test 2 Failed: Expected bare URL but got:', res2);
    process.exit(1);
  }

  // Test Case 3: Header only or empty -> Fallback
  const emptyRows = [['Логотип'], ['']];
  const res3 = parseLogoUrlFromRows(emptyRows);
  if (res3 === DEFAULT_CLUB_LOGO) {
    console.log('✅ Test 3 Passed: Empty row falls back to DEFAULT_CLUB_LOGO');
  } else {
    console.error('❌ Test 3 Failed: Expected default logo but got:', res3);
    process.exit(1);
  }

  console.log('🎉 ALL LOGO PARSER TESTS PASSED!');
}

runLogoParserTests();
