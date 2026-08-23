// Types for all 23 Google Sheets tables and application entities for Poker Club "БАЗА"

// 1. ТУРНИРНАЯ ТАБЛИЦА
export interface TournamentRecord {
  id: string;
  tournamentId: string;
  tournamentName: string;
  date: string;
  playerId: string;
  playerNickname: string;
  place: number;
  points: number;
  bountyCount: number;
  prizeMoney: number;
  rebuys: number;
  addons: number;
}

// 2. ЕЖЕДНЕВНЫЕ ИГРЫ
export interface DailyGame {
  id: string;
  gameDateId: string;
  date: string;
  gameType: string; // e.g., NLH, PLO
  buyIn: number;
  guarantee: number;
  playersCount: number;
  status: 'Анонс' | 'Идет игра' | 'Завершен' | 'Отменен';
}

// 3. ДАТЫ ЕЖЕДНЕВНЫХ ИГР
export interface DailyGameDate {
  id: string;
  date: string;
  dayOfWeek: string;
  isSpecialEvent: boolean;
  notes?: string;
}

// 4. БАУНТИ
export interface Bounty {
  id: string;
  tournamentId: string;
  hunterPlayerId: string;
  targetPlayerId: string;
  bountyAmount: number;
  timestamp: string;
}

// 5. ВАРИАНТЫ БАУНТИ
export interface BountyOption {
  id: string;
  title: string;
  rewardPoints: number;
  description: string;
}

// 6. ЗАДАНИЯ
export interface Task {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  category: string;
  isActive: boolean;
}

// 7. ВАРИАНТЫ СПЕЦЗАДАНИЙ
export interface SpecialTaskOption {
  id: string;
  title: string;
  difficulty: 'Легкое' | 'Среднее' | 'Сложное' | 'Эпическое';
  rewardPoints: number;
  description: string;
}

// 8. СПРАВОЧНИКИ
export interface ReferenceItem {
  id: string;
  category: string;
  key: string;
  value: string;
}

// 9. СЕЗОННЫЕ ТУРНИРЫ
export interface SeasonalTournament {
  id: string;
  seasonName: string; // e.g., "Осень 2024"
  startDate: string;
  endDate: string;
  guaranteedPrizePool: number;
  status: 'Предстоящий' | 'Активен' | 'Завершен';
  calendarUrl?: string;
}

// 10. ОПЛАЧЕНО
export interface Payment {
  id: string;
  playerId: string;
  playerNickname: string;
  amount: number;
  purpose: string; // e.g. "Бай-ин Турнир #12"
  date: string;
  paymentMethod: string;
  status: 'Подтверждено' | 'Ожидает' | 'Отклонено';
}

// 11. АДМИНИСТРАТОРЫ
export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  role: 'СуперАдмин' | 'Админ' | 'Менеджер';
  telegramId?: string;
}

// 12. АНАЛИТИКА
export interface AnalyticsData {
  id: string;
  metricName: string;
  metricValue: number | string;
  period: string;
  updatedAt: string;
}

// 13. В КЛУБЕ
export interface ClubPresence {
  id: string;
  playerId: string;
  playerNickname: string;
  checkInTime: string;
  tableNumber?: number;
  status: 'В игре' | 'Отдыхает' | 'Завершил';
}

// 14. ИГРОКИ
export interface Player {
  id: string;
  nickname: string;
  password?: string;
  fullName: string;
  phone: string;
  avatarUrl: string;
  rating: number;
  status: 'ЧЕМПИОН' | 'ЗОЛОТОЙ ИГРОК' | 'МОНСТР' | 'ИГРОК';
  role: 'Админ' | 'Игрок';
  isAuthorized: boolean;
  registeredAt: string;
  gamesPlayed: number;
  winsCount: number;
  totalPrizes: number;
}

// 15. НАГРАДЫ
export interface Reward {
  id: string;
  title: string;
  badgeUrl: string;
  description: string;
  pointsRequired: number;
  category: string;
}

// 16. НАГРАДЫ ПО ОТДЕЛЬНОСТИ
export interface IndividualReward {
  id: string;
  rewardId: string;
  rewardTitle: string;
  assignedToPlayerId: string;
  assignedAt: string;
}

// 17. НАЧИСЛЕНИЕ НАГРАД
export interface RewardGrant {
  id: string;
  playerId: string;
  playerNickname: string;
  rewardTitle: string;
  pointsGranted: number;
  grantedBy: string;
  date: string;
  reason: string;
}

// 18. ФИЛЬТР
export interface FilterOption {
  id: string;
  filterGroup: string;
  name: string;
  value: string;
}

// 19. НОВОСТИ
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt: string;
  commentsCount: number;
}

// 20. КОММЕНТАРИИ НОВОСТЕЙ
export interface NewsComment {
  id: string;
  newsId: string;
  playerId: string;
  playerNickname: string;
  avatarUrl?: string;
  comment: string;
  createdAt: string;
}

// 21. АКЦИИ
export interface Promotion {
  id: string;
  title: string;
  description: string;
  badgeText: string;
  imageUrl: string;
  validUntil: string;
  isActive: boolean;
}

// 22. КЛУБ
export interface ClubInfo {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  workingHours: string;
  description: string;
  rulesUrl?: string;
  logoUrl?: string;
}

// 23. ЧАТ
export interface ChatMessage {
  id: string;
  playerId: string;
  playerNickname: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
  isTelegramSync?: boolean;
}

// Period type for Ratings filter
export type RatingPeriod = 'today' | 'month' | 'season' | 'year' | 'all';
