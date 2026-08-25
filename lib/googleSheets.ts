import { google } from 'googleapis';
import {
  PlayerRow, PromotionRow, TournamentTableRow, SeasonalTournamentRow,
  AnalyticsRow, InClubRow, NewsRow, ChatRow, ClubRow, RewardRow, RewardGrantRow,
  DailyGameDateRow, DailyGameRow
} from '../types';

export const mockData = {
  players: [
    {
      'Ник': 'PokerKing',
      'Пароль': 'password123',
      'Имя': 'Алексей Смирнов',
      'Роль': 'Админ',
      'Email': 'pokerking@baza.ru',
      'Аватар': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Бан': false,
      'Авторизован?': true,
      'Telegram ID': '12345678',
      'Анимация?': true,
      'Админ?': true,
      'User ID': 'p1',
      'Общий рейтинг': 1450,
      'Статус': 'ЧЕМПИОН',
      'Место': 1,
      'QR': 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PokerKing',
      'QR URL': 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PokerKing',
      'Онлайн': true,
      'Играет?': true,
      'Авторизация шаги': '3/3',
      'Соглашение о правилах': true,
      'Выбранный сезон': 'Осень 2024',
      'Номер телефона': '+79991112233',
      'Выбранный Игрок': 'PokerKing',
      '🔒 Row ID': 'row_p1',
    },
    {
      'Ник': 'BluffMaster',
      'Пароль': 'password123',
      'Имя': 'Дмитрий Иванов',
      'Роль': 'Игрок',
      'Email': 'bluff@baza.ru',
      'Аватар': 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      'Бан': false,
      'Авторизован?': true,
      'Telegram ID': '',
      'Анимация?': true,
      'Админ?': false,
      'User ID': 'p2',
      'Общий рейтинг': 1280,
      'Статус': 'ЗОЛОТОЙ ИГРОК',
      'Место': 2,
      'QR': 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BluffMaster',
      'QR URL': 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BluffMaster',
      'Онлайн': true,
      'Играет?': false,
      'Авторизация шаги': '3/3',
      'Соглашение о правилах': true,
      'Выбранный сезон': 'Осень 2024',
      'Номер телефона': '+79992223344',
      'Выбранный Игрок': 'BluffMaster',
      '🔒 Row ID': 'row_p2',
    },
  ] as PlayerRow[],

  tournamentTable: [
    {
      'Место': 1,
      'Ник': 'PokerKing',
      'Имя': 'Алексей Смирнов',
      'Общий рейтинг': 1450,
      'Баунти': 12,
      'Спец.задания': 'Выполнены 4',
      'Рейтинг в играх': 1200,
      'Статус': 'ЧЕМПИОН',
      'В клубе': 'Да',
      'Телеграм ID': '12345678',
      '🔒 Row ID': 'tt_1',
    },
    {
      'Место': 2,
      'Ник': 'BluffMaster',
      'Имя': 'Дмитрий Иванов',
      'Общий рейтинг': 1280,
      'Баунти': 8,
      'Спец.задания': 'Выполнены 2',
      'Рейтинг в играх': 1100,
      'Статус': 'ЗОЛОТОЙ ИГРОК',
      'В клубе': 'Да',
      'Телеграм ID': '',
      '🔒 Row ID': 'tt_2',
    },
  ] as TournamentTableRow[],

  promotions: [
    {
      'Название': 'Приветственный бонус +20%',
      'Описание': 'Получите 20% дополнительный стек при первом бай-ине в этом месяце!',
      'Дата начала': '2024-10-01',
      'Дата окончания': '2024-12-31',
      'Уведомление': 'Отправлено',
      'Картинка': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
    },
  ] as PromotionRow[],

  seasonalTournaments: [
    {
      'Название': 'Осенний Кубок 2024',
      'Дата начала': '2024-10-01T19:00:00Z',
      'Взнос': 5000,
      'Статус': 'Активен',
      'Описание': 'Главный турнир осени с гарантированным фондом 100 000 ₽.',
      'Фото': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
      'Предоплата?': 'Да',
      'Уведомление': 'Да',
      'Дата окончания': '2024-12-31T23:30:00Z',
      'Завершить турнир': 'Нет',
      'Завершено': 'Нет',
    },
  ] as SeasonalTournamentRow[],

  chat: [
    {
      'Игрок': 'PokerKing',
      'Сообщение': 'Привет! Будешь сегодня на ежедневном турнире?',
      'Кому? От кого?': 'bluff@baza.ru',
      'Дата и время отправки': new Date(Date.now() - 3600000).toISOString(),
      'Игрок фото': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'Игрок почта': 'pokerking@baza.ru',
    },
    {
      'Игрок': 'BluffMaster',
      'Сообщение': 'Да, буду обязательно в 19:00!',
      'Кому? От кого?': 'pokerking@baza.ru',
      'Дата и время отправки': new Date(Date.now() - 1800000).toISOString(),
      'Игрок фото': 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      'Игрок почта': 'bluff@baza.ru',
    },
  ] as ChatRow[],

  news: [
    {
      'Дата': '2024-10-01',
      'Заголовок': 'Открытие осенней серии турниров "БАЗА 2024"',
      'Текст': 'Приглашаем всех игроков принять участие в грандиозной осенней серии. Общий призовой фонд превысит 1 000 000 рублей!',
      'Фото': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800',
      'Автор': 'Администрация',
      'Уведомление': 'Да',
    },
  ] as NewsRow[],

  club: [
    {
      'О клубе': 'БАЗА — это премиальный спортивный покерный клуб с уютной атмосферой, профессиональными дилерами и турнирной аналитикой.',
      'Логотип': 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg',
      '🔒 Row ID': 'club_row_1',
      'Анимация': 'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/wL3hInXFOhhKd6RQyUOY.gif',
      'Телефон': '+7 (495) 000-77-88',
      'Поддержка': '@baza_support',
      'Приложение': 'БАЗА v1.0',
    },
  ] as ClubRow[],

  analytics: [
    {
      'Общий Банк Клуба': 1450000,
      'Всего Игр': 150,
      'Выплачено Баунти': 320000,
      'Количество Золотых игроков': 8,
      'Текущий Банк (за сегодня)': 75000,
      'Всего игроков': 148,
      'Средний рейтинг': 1150,
      'Самый активный': 'PokerKing',
    },
  ] as AnalyticsRow[],

  inClub: [
    {
      'Дата': new Date().toISOString().split('T')[0],
      'Ник': 'PokerKing',
      'Время входа': '16:30',
      'Статус': 'В игре',
      'Имя': 'Алексей Смирнов',
      'Email': 'pokerking@baza.ru',
      'Подтвержден?': 'Да',
      'Аватар': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'ID': 'p1',
      'Телеграм ID': '12345678',
      'Номер телефона': '+79991112233',
    },
  ] as InClubRow[],

  rewardsThresholds: [
    {
      'Название': 'Мастер Покера',
      'За сколько начало': 5,
      'За второе': 10,
      'За первое': 15,
      'Описание': 'Награда за победы и баунти в сезонных кубках.',
    },
  ] as RewardRow[],

  earnedRewardsColor: [
    {
      'Название': 'Мастер Покера',
      'Картинка': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200',
    },
  ],

  unearnedRewardsBW: [
    {
      'Название': 'Мастер Покера',
      'Картинка': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&sat=-100',
    },
  ],

  rewardGrants: [
    {
      'Ник': 'PokerKing',
      'Название': 'Мастер Покера',
      'Количество': 8,
      'Кто выбил': 'Админ',
      'Дата': '2024-10-15',
    },
  ] as RewardGrantRow[],

  dailyGameDates: [
    {
      'Дата': new Date().toISOString().split('T')[0],
      'Название': 'Ежедневный турнир "БЛИЦ"',
      'Изображение': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
      'Описание': 'Динамичная игра с быстрыми блайндами и гарантированным баунти за каждого игрока.',
      'Всего игроков': 12,
      'Банк рейтинга': 50000,
      'Вес турнира': 1.5,
    },
  ] as DailyGameDateRow[],

  dailyGames: [
    {
      'Дата': new Date().toISOString().split('T')[0],
      'Ник': 'PokerKing',
      'Место': 1,
      'Начислено': 150,
      'Стоимость': 3000,
      'Номер телефона': '+79991112233',
      'Почта': 'pokerking@baza.ru',
      'Рейтинг': 1450,
      'Баунти': 3,
      'Спец. Задания': 'Выполнено',
      'Статус': 'В игре',
      'Имя': 'Алексей Смирнов',
    },
    {
      'Дата': new Date().toISOString().split('T')[0],
      'Ник': 'BluffMaster',
      'Место': 2,
      'Начислено': 100,
      'Стоимость': 3000,
      'Номер телефона': '+79992223344',
      'Почта': 'bluff@baza.ru',
      'Рейтинг': 1280,
      'Баунти': 1,
      'Спец. Задания': '-',
      'Статус': 'В игре',
      'Имя': 'Дмитрий Иванов',
    },
  ] as DailyGameRow[],
};

function getGoogleSheetsClient() {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) return null;

  try {
    const credentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY', err);
    return null;
  }
}

export async function readSheet<T = any>(sheetName: string): Promise<T[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const nameLower = sheetName.trim().toLowerCase();
    if (nameLower === 'игроки') return mockData.players as unknown as T[];
    if (nameLower === 'турнирная таблица') return mockData.tournamentTable as unknown as T[];
    if (nameLower === 'акции') return mockData.promotions as unknown as T[];
    if (nameLower === 'сезонные турниры') return mockData.seasonalTournaments as unknown as T[];
    if (nameLower === 'чат') return mockData.chat as unknown as T[];
    if (nameLower === 'новости') return mockData.news as unknown as T[];
    if (nameLower === 'клуб') return mockData.club as unknown as T[];
    if (nameLower === 'аналитика') return mockData.analytics as unknown as T[];
    if (nameLower === 'в клубе') return mockData.inClub as unknown as T[];
    if (nameLower === 'награды') return mockData.rewardsThresholds as unknown as T[];
    if (nameLower === 'награды по отдельности') return mockData.earnedRewardsColor as unknown as T[];
    if (nameLower === 'награды чб по отдельности') return mockData.unearnedRewardsBW as unknown as T[];
    if (nameLower === 'начисление наград') return mockData.rewardGrants as unknown as T[];
    if (nameLower === 'даты ежедневных игр') return mockData.dailyGameDates as unknown as T[];
    if (nameLower === '🎮 ежедневные игры' || nameLower === 'ежедневные игры') return mockData.dailyGames as unknown as T[];
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return [];

    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined ? row[index] : '';
      });
      return obj as T;
    });
  } catch (error) {
    console.error(`Error reading sheet ${sheetName}:`, error);
    return [];
  }
}

export async function writeRow(sheetName: string, rowData: Record<string, any>): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const nameLower = sheetName.trim().toLowerCase();
    if (nameLower === 'игроки') mockData.players.push(rowData as PlayerRow);
    else if (nameLower === 'чат') mockData.chat.push(rowData as ChatRow);
    else if (nameLower === 'сезонные турниры') mockData.seasonalTournaments.push(rowData as SeasonalTournamentRow);
    else if (nameLower === '🎮 ежедневные игры' || nameLower === 'ежедневные игры') mockData.dailyGames.push(rowData as DailyGameRow);
    return true;
  }

  try {
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = sheetData.data.values?.[0] || Object.keys(rowData);
    const valuesRow = headers.map((h) => rowData[h] ?? '');

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [valuesRow] },
    });
    return true;
  } catch (error) {
    console.error(`Error writing row to sheet ${sheetName}:`, error);
    return false;
  }
}

export async function updateRow(sheetName: string, nickOrIdKey: string, nickOrIdValue: string, updatedFields: Record<string, any>): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    const nameLower = sheetName.trim().toLowerCase();
    if (nameLower === 'игроки') {
      const idx = mockData.players.findIndex((p) => p['Ник'] === nickOrIdValue || p['User ID'] === nickOrIdValue);
      if (idx !== -1) {
        mockData.players[idx] = { ...mockData.players[idx], ...updatedFields };
      }
    }
    return true;
  }

  try {
    const data = await readSheet(sheetName);
    const rowIndex = data.findIndex((row: any) => row[nickOrIdKey] === nickOrIdValue || row['Ник'] === nickOrIdValue);
    if (rowIndex === -1) return false;

    const rowNum = rowIndex + 2;
    const mergedRow = { ...data[rowIndex], ...updatedFields };

    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1`,
    });
    const headers = sheetData.data.values?.[0] || Object.keys(mergedRow);
    const values = [headers.map((h) => mergedRow[h] ?? '')];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return true;
  } catch (error) {
    console.error(`Error updating row in sheet ${sheetName}:`, error);
    return false;
  }
}

export async function deleteRow(sheetName: string, nickOrIdValue: string): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const nameLower = sheetName.trim().toLowerCase();
  if (nameLower === 'игроки') {
    mockData.players = mockData.players.filter((p) => p['Ник'] !== nickOrIdValue);
  } else if (nameLower === 'сезонные турниры') {
    mockData.seasonalTournaments = mockData.seasonalTournaments.filter((t) => t['Название'] !== nickOrIdValue);
  }

  if (!sheets || !spreadsheetId) return true;

  try {
    const data = await readSheet(sheetName);
    const rowIndex = data.findIndex((row: any) => row['Ник'] === nickOrIdValue || row['Название'] === nickOrIdValue);
    if (rowIndex === -1) return false;

    const rowNum = rowIndex + 2;
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A${rowNum}:Z${rowNum}`,
    });
    return true;
  } catch (err) {
    console.error(`Error deleting row in ${sheetName}:`, err);
    return false;
  }
}
