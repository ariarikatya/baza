import { google } from 'googleapis';

function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!serviceAccountKey || !spreadsheetId) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEET_ID missing in process.env');
    return null;
  }

  try {
    const credentials = typeof serviceAccountKey === 'string'
      ? JSON.parse(serviceAccountKey)
      : serviceAccountKey;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('❌ Error parsing credentials:', err);
    return null;
  }
}

function indexToColumnName(index) {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

async function main() {
  const isApply = process.argv.includes('--apply');
  const mapArg = process.argv.find((arg) => arg.startsWith('--map='));

  let mapping = {
    '452014803': '1', // Default mapping: Telegram ID 452014803 -> User ID "1" (Котя)
  };

  if (mapArg) {
    try {
      const jsonStr = mapArg.replace('--map=', '');
      mapping = JSON.parse(jsonStr);
    } catch (e) {
      console.error('❌ Failed to parse --map JSON:', e.message);
      process.exit(1);
    }
  }

  console.log(`🔍 Mode: ${isApply ? 'APPLY (writing changes)' : 'DRY-RUN (read-only preview)'}`);
  console.log(`📋 Active Telegram ID mapping:`, mapping);

  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    console.error('❌ Sheets client not initialized.');
    process.exit(1);
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Игроки!A1:ZZ1000',
  });

  const rows = response.data.values || [];
  if (rows.length < 2) {
    console.log('No rows found in sheet "Игроки".');
    return;
  }

  const headers = rows[0].map((h) => String(h || '').trim());
  const nickIdx = headers.findIndex((h) => h.toLowerCase() === 'ник');
  const userIdIdx = headers.findIndex((h) => h.toLowerCase() === 'user id');
  const tgIdIdx = headers.findIndex((h) => h.toLowerCase() === 'telegram id');

  if (tgIdIdx === -1) {
    console.error('❌ Header "Telegram ID" not found in sheet "Игроки"');
    process.exit(1);
  }

  const tgColLetter = indexToColumnName(tgIdIdx);
  console.log(`\n--- ALL PLAYERS WITH NON-EMPTY Telegram ID ---`);

  const boundPlayers = [];
  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;
    const row = rows[i];
    const nick = nickIdx !== -1 ? (row[nickIdx] || '') : '';
    const userId = userIdIdx !== -1 ? (row[userIdIdx] || '') : '';
    const tgId = row[tgIdIdx] || '';

    if (String(tgId).trim() !== '') {
      boundPlayers.push({ rowNum, nick, userId, tgId });
      console.log(`Row ${rowNum} (${tgColLetter}${rowNum}): Ник="${nick}", User ID="${userId}", Telegram ID="${tgId}"`);
    }
  }

  console.log(`Total rows with Telegram ID: ${boundPlayers.length}\n`);

  // Plan changes
  const updatesToApply = []; // { range, value, reason }

  for (const [targetTgId, targetUserOrNick] of Object.entries(mapping)) {
    const tgStr = String(targetTgId).trim();
    const targetNorm = String(targetUserOrNick).trim().toLowerCase();

    // Find row that SHOULD have targetTgId
    let correctRow = null;
    let correctRowNum = -1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nick = nickIdx !== -1 ? String(row[nickIdx] || '').trim().toLowerCase() : '';
      const userId = userIdIdx !== -1 ? String(row[userIdIdx] || '').trim().toLowerCase() : '';

      if (userId === targetNorm || nick === targetNorm) {
        correctRow = row;
        correctRowNum = i + 1;
        break;
      }
    }

    if (!correctRow) {
      console.warn(`⚠️ Target player "${targetUserOrNick}" for Telegram ID ${tgStr} not found in "Игроки"`);
      continue;
    }

    const currentTgInTarget = String(correctRow[tgIdIdx] || '').trim();
    if (currentTgInTarget !== tgStr) {
      updatesToApply.push({
        range: `Игроки!${tgColLetter}${correctRowNum}`,
        value: tgStr,
        reason: `Assign Telegram ID ${tgStr} to target player "${correctRow[nickIdx]}" (User ID: ${correctRow[userIdIdx]})`,
      });
    }

    // Find all OTHER rows that currently have targetTgId and clear them
    for (let i = 1; i < rows.length; i++) {
      const rowNum = i + 1;
      if (rowNum === correctRowNum) continue;

      const row = rows[i];
      const currentTg = String(row[tgIdIdx] || '').trim();

      if (currentTg === tgStr) {
        updatesToApply.push({
          range: `Игроки!${tgColLetter}${rowNum}`,
          value: '',
          reason: `Clear wrong Telegram ID ${tgStr} from player "${row[nickIdx]}" (User ID: ${row[userIdIdx]})`,
        });
      }
    }
  }

  console.log(`--- PLANNED UPDATES (${updatesToApply.length}) ---`);
  for (const u of updatesToApply) {
    console.log(`[${u.range}] => "${u.value}" | ${u.reason}`);
  }

  if (updatesToApply.length === 0) {
    console.log('✅ No changes needed. All Telegram ID bindings match target mapping.');
    return;
  }

  if (!isApply) {
    console.log('\n💡 Dry-run complete. Run with --apply to perform updates in Google Sheets.');
    return;
  }

  console.log('\n🚀 Executing updates in Google Sheets...');
  const batchData = updatesToApply.map((u) => ({
    range: u.range,
    values: [[u.value]],
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    },
  });

  console.log('✅ All updates successfully applied!');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
