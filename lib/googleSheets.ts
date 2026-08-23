import { google } from 'googleapis';
import {
  Player, Promotion, TournamentRecord, DailyGame, Bounty, Task,
  SeasonalTournament, AdminUser, ClubPresence, Reward, NewsItem, NewsComment, ChatMessage, ClubInfo
} from '../types';

// Mock in-memory storage for fallback when Google Sheets API credentials are not provided
export const mockData = {
  players: [
    {
      id: 'p1',
      nickname: 'PokerKing',
      password: 'password123',
      fullName: 'Алексей Смирнов',
      phone: '+79991112233',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      rating: 1450,
      status: 'ЧЕМПИОН',
      role: 'Админ',
      isAuthorized: true,
      registeredAt: '2024-01-15',
      gamesPlayed: 42,
      winsCount: 12,
      totalPrizes: 150000,
    },
    {
      id: 'p2',
      nickname: 'BluffMaster',
      password: 'password123',
      fullName: 'Дмитрий Иванов',
      phone: '+79992223344',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      rating: 1280,
      status: 'ЗОЛОТОЙ ИГРОК',
      role: 'Игрок',
      isAuthorized: true,
      registeredAt: '2024-02-01',
      gamesPlayed: 35,
      winsCount: 7,
      totalPrizes: 85000,
    },
    {
      id: 'p3',
      nickname: 'FishHunter',
      password: 'password123',
      fullName: 'Елена Кузнецова',
      phone: '+79993334455',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      rating: 980,
      status: 'МОНСТР',
      role: 'Игрок',
      isAuthorized: false,
      registeredAt: '2024-03-10',
      gamesPlayed: 20,
      winsCount: 3,
      totalPrizes: 32000,
    },
    {
      id: 'p4',
      nickname: 'Newbie99',
      password: 'password123',
      fullName: 'Максим Петров',
      phone: '+79994445566',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150',
      rating: 600,
      status: 'ИГРОК',
      role: 'Игрок',
      isAuthorized: false,
      registeredAt: '2024-04-05',
      gamesPlayed: 8,
      winsCount: 0,
      totalPrizes: 5000,
    },
  ] as Player[],

  promotions: [
    {
      id: 'prom1',
      title: 'Приветственный бонус +20%',
      description: 'Получите 20% дополнительный стек при первом бай-ине в этом месяце!',
      badgeText: 'АКЦИЯ',
      imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=600',
      validUntil: '2024-12-31',
      isActive: true,
    },
    {
      id: 'prom2',
      title: 'Охота за Баунти',
      description: 'Выбей Лидера рейтинга и получи двойные баунти-очки!',
      badgeText: 'СПЕЦПРЕДЛОЖЕНИЕ',
      imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
      validUntil: '2024-11-30',
      isActive: true,
    },
    {
      id: 'prom3',
      title: 'Ночной турнир Friday High Stakes',
      description: 'Каждую пятницу повышенный гарантированный призовой фонд!',
      badgeText: 'ТУРНИР',
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
      validUntil: '2025-01-01',
      isActive: true,
    },
    {
      id: 'prom4',
      title: 'Приведи друга',
      description: 'Получи 1000 бонусных очков за каждого приглашенного нового игрока.',
      badgeText: 'БОНУС',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600',
      validUntil: '2024-12-31',
      isActive: true,
    },
  ] as Promotion[],

  tournaments: [
    {
      id: 't1',
      seasonName: 'Осенний Кубок 2024',
      startDate: '2024-10-25T19:00:00Z',
      endDate: '2024-10-25T23:30:00Z',
      guaranteedPrizePool: 100000,
      status: 'Активен',
      calendarUrl: 'https://calendar.google.com/calendar/r/eventedit?text=BAZA+Main+Event',
    },
    {
      id: 't2',
      seasonName: 'Sunday High Roller',
      startDate: '2024-10-27T18:00:00Z',
      endDate: '2024-10-27T23:59:00Z',
      guaranteedPrizePool: 250000,
      status: 'Предстоящий',
      calendarUrl: 'https://calendar.google.com/calendar/r/eventedit?text=Sunday+High+Roller',
    },
  ] as SeasonalTournament[],

  chatMessages: [
    {
      id: 'c1',
      playerId: 'p1',
      playerNickname: 'PokerKing',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      message: 'Привет всем! Кто сегодня на турнир в 19:00?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'c2',
      playerId: 'p2',
      playerNickname: 'BluffMaster',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      message: 'Я уже зарегистрировался! Готовьте свои фишки 🔥',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
  ] as ChatMessage[],

  news: [
    {
      id: 'n1',
      title: 'Открытие осенней серии турниров "БАЗА 2024"',
      content: 'Приглашаем всех игроков принять участие в грандиозной осенней серии. Общий призовой фонд превысит 1 000 000 рублей!',
      imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800',
      author: 'Администрация',
      createdAt: '2024-10-01',
      commentsCount: 5,
    },
  ] as NewsItem[],

  clubInfo: {
    id: 'club1',
    name: 'Покерный Клуб "БАЗА"',
    tagline: 'Место встречи профессионалов и любителей покера',
    address: 'г. Москва, ул. Тверская, д. 15',
    phone: '+7 (495) 000-77-88',
    workingHours: 'Ежедневно с 16:00 до 05:00',
    description: 'БАЗА — это премиальный клуб с уютной атмосферой, профессиональным дилерами, турнирной аналитикой и комфортной VIP-зоной.',
    rulesUrl: '/rules',
  } as ClubInfo,
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
    // Return mock data fallback
    if (sheetName.toLowerCase().includes('игрок') || sheetName === 'ИГРОКИ') {
      return mockData.players as unknown as T[];
    }
    if (sheetName.toLowerCase().includes('акци') || sheetName === 'АКЦИИ') {
      return mockData.promotions as unknown as T[];
    }
    if (sheetName.toLowerCase().includes('турнир') || sheetName === 'СЕЗОННЫЕ ТУРНИРЫ') {
      return mockData.tournaments as unknown as T[];
    }
    if (sheetName.toLowerCase().includes('чат') || sheetName === 'ЧАТ') {
      return mockData.chatMessages as unknown as T[];
    }
    if (sheetName.toLowerCase().includes('новост') || sheetName === 'НОВОСТИ') {
      return mockData.news as unknown as T[];
    }
    if (sheetName.toLowerCase().includes('клуб') || sheetName === 'КЛУБ') {
      return [mockData.clubInfo] as unknown as T[];
    }
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
    // Fallback in-memory write
    if (sheetName === 'ИГРОКИ') {
      mockData.players.push(rowData as Player);
    } else if (sheetName === 'ЧАТ') {
      mockData.chatMessages.push(rowData as ChatMessage);
    }
    return true;
  }

  try {
    const values = [Object.values(rowData)];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    return true;
  } catch (error) {
    console.error(`Error writing row to sheet ${sheetName}:`, error);
    return false;
  }
}

export async function updateRow(sheetName: string, id: string, updatedFields: Record<string, any>): Promise<boolean> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!sheets || !spreadsheetId) {
    if (sheetName === 'ИГРОКИ') {
      const idx = mockData.players.findIndex((p) => p.id === id);
      if (idx !== -1) {
        mockData.players[idx] = { ...mockData.players[idx], ...updatedFields };
      }
    }
    return true;
  }

  try {
    // Real implementation reads rows, finds index by id column (Col A), updates specific range
    const data = await readSheet(sheetName);
    const rowIndex = data.findIndex((row: any) => row.id === id);
    if (rowIndex === -1) return false;

    const rowNum = rowIndex + 2; // +1 for 0-index, +1 for header
    const values = [Object.values({ ...data[rowIndex], ...updatedFields })];

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

export async function deleteRow(sheetName: string, id: string): Promise<boolean> {
  // Simple delete helper fallback
  if (sheetName === 'ИГРОКИ') {
    mockData.players = mockData.players.filter((p) => p.id !== id);
  } else if (sheetName === 'ЧАТ') {
    mockData.chatMessages = mockData.chatMessages.filter((c) => c.id !== id);
  }
  return true;
}
