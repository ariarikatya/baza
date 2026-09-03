// Exact Google Sheets interfaces for all tables using Russian column names

export interface Player {
  'Ник': string;
  'Пароль': string;
  'Имя': string;
  'Роль': string;
  'Email'?: string;
  'Аватар'?: string;
  'Бан'?: boolean | string;
  'Авторизован?'?: boolean | string;
  'Telegram ID'?: string;
  'Анимация?'?: boolean | string;
  'Админ?'?: boolean | string;
  'User ID'?: string;
  'Общий рейтинг'?: number | string;
  'Статус'?: string;
  'Место'?: number | string;
  'QR'?: string;
  'QR URL'?: string;
  'Онлайн'?: boolean | string;
  'Играет?'?: boolean | string;
  'Авторизация шаги'?: string;
  'Соглашение о правилах'?: boolean | string;
  'Выбранный сезон'?: string;
  'Номер телефона'?: string;
  'Выбранный Игрок'?: string;
  '🔒 Row ID'?: string;
}
export type PlayerRow = Player;

export interface TournamentTable {
  'Место': number | string;
  'Ник': string;
  'Имя'?: string;
  'Общий рейтинг': number | string;
  'Баунти'?: number | string;
  'Спец.задания'?: string;
  'Рейтинг в играх'?: number | string;
  'Статус'?: string;
  'В клубе'?: string;
  'Телеграм ID'?: string;
  'Бан'?: boolean | string;
  '🔒 Row ID'?: string;
}
export type TournamentTableRow = TournamentTable;

export interface DailyGame {
  'Дата': string;
  'Ник': string;
  'Место'?: number | string;
  'Начислено'?: number | string;
  'Стоимость'?: number | string;
  'Номер телефона'?: string;
  'Почта'?: string;
  'Рейтинг'?: number | string;
  'Баунти'?: number | string;
  'Спец. Задания'?: string;
  'Статус'?: string;
  'Имя'?: string;
  'Игроков в день'?: number | string;
  'Вышел?'?: boolean | string;
  'Подтвержден?'?: boolean | string;
  'Время выхода'?: string;
  '🔒 Row ID'?: string;
}
export type DailyGameRow = DailyGame;

export interface Bounty {
  'Ник': string;
  'Кол-во'?: number | string;
  'Дата'?: string;
  'Кто выбил'?: string;
  'Баллы'?: number | string;
  '🔒 Row ID'?: string;
}
export type BountyRow = Bounty;

export interface Task {
  'Ник': string;
  'Задание': string;
  'Дата'?: string;
  'Статус'?: string;
  'Баллы'?: number | string;
  '🔒 Row ID'?: string;
}
export type TaskRow = Task;

export interface RewardGrant {
  'Ник': string;
  'Название': string;
  'Количество'?: number | string;
  'Кто выбил'?: string;
  'Дата'?: string;
  '🔒 Row ID'?: string;
}
export type RewardGrantRow = RewardGrant;

export interface Reward {
  'Название': string;
  'За сколько начало'?: number | string;
  'За второе'?: number | string;
  'За первое'?: number | string;
  'За третье'?: number | string;
  'За четвертое'?: number | string;
  'Описание'?: string;
  '🔒 Row ID'?: string;
}
export type RewardRow = Reward;

export interface IndividualReward {
  'Название': string;
  'Картинка'?: string;
  '🔒 Row ID'?: string;
}
export type IndividualRewardRow = IndividualReward;

export interface IndividualRewardBW {
  'Название': string;
  'Картинка'?: string;
  '🔒 Row ID'?: string;
}
export type IndividualRewardBWRow = IndividualRewardBW;

export interface Chat {
  'Игрок': string;
  'Сообщение': string;
  'Кому? От кого?'?: string;
  'Дата и время отправки': string;
  'Игрок фото'?: string;
  'Игрок почта'?: string;
  '🔒 Row ID'?: string;
}
export type ChatRow = Chat;

export interface DailyGameDateRow {
  'Дата': string;
  'Дата и Время'?: string;
  'Дата окончания регистрации'?: string;
  'Название'?: string;
  'Изображение'?: string;
  'Описание'?: string;
  'Что будет описание'?: string;
  'Всего игроков'?: number | string;
  'Банк рейтинга'?: number | string;
  'Стоимость'?: number | string;
  'Вес турнира'?: number | string;
  '🔒 Row ID'?: string;
  [key: string]: any;
}

export interface BountyOptionRow {
  'Вариант': string;
  'Значение': string;
}

export interface SpecialTaskOptionRow {
  'Задание': string;
  'Очки': number | string;
}

export interface ReferenceRow {
  'Категория': string;
  'Значение': string;
}

export interface SeasonalTournamentRow {
  'Название': string;
  'Дата начала': string;
  'Взнос': number | string;
  'Статус': string;
  'Описание'?: string;
  'Фото'?: string;
  'Предоплата?'?: string;
  'Уведомление'?: string;
  'Дата окончания'?: string;
  'Завершить турнир'?: string;
  'Завершено'?: string;
  '🔒 Row ID'?: string;
}

export interface PaidRow {
  'Ник': string;
  'Сумма': number | string;
  'Дата': string;
  'Турнир': string;
}

export interface AdminRow {
  'Ник': string;
  'Роль': string;
  'Доступ': string;
}

export interface AnalyticsRow {
  'Общий Банк Клуба'?: number | string;
  'Всего Игр'?: number | string;
  'Выплачено Баунти'?: number | string;
  'Количество Золотых игроков'?: number | string;
  'Текущий Банк (за сегодня)'?: number | string;
  'Всего игроков'?: number | string;
  'Средний рейтинг'?: number | string;
  'Самый активный'?: string;
  [key: string]: any;
}

export interface InClubRow {
  'Дата': string;
  'Ник': string;
  'Время входа': string;
  'Статус': string;
  'Имя'?: string;
  'Email'?: string;
  'Подтвержден?'?: boolean | string;
  'Аватар'?: string;
  'ID'?: string;
  'Телеграм ID'?: string;
  'Номер телефона'?: string;
  'Вышел сегодня'?: boolean | string;
  'Время выхода'?: string;
}

export interface EarnedRewardColorRow {
  'Название': string;
  'Картинка': string;
}

export interface UnearnedRewardBWRow {
  'Название': string;
  'Картинка': string;
}

export interface FilterRow {
  'Фильтр': string;
  'Значение': string;
}

export interface NewsRow {
  'Дата': string;
  'Заголовок': string;
  'Текст': string;
  'Фото'?: string;
  'Автор'?: string;
  'Уведомление'?: string;
}

export interface NewsCommentRow {
  'Новость': string;
  'Игрок': string;
  'Комментарий': string;
  'Дата': string;
  'Автор'?: string;
  'Аватар'?: string;
}

export interface PromotionRow {
  'Название': string;
  'Описание': string;
  'Дата начала': string;
  'Дата окончания': string;
  'Уведомление': string;
  'Картинка'?: string;
}

export interface ClubRow {
  'Название'?: string;
  'О клубе': string;
  'Логотип': string;
  '🔒 Row ID'?: string;
  'Анимация'?: string;
  'Телефон': string;
  'Поддержка': string;
  'Приложение'?: string;
  [key: string]: any;
}

export type RatingPeriod = 'today' | 'month' | 'season' | 'year' | 'all';

/**
 * Safe date formatter converting various formats/timestamps into 'DD.MM.YYYY HH:mm'
 */
export function formatRussianDate(dateVal?: string | Date | number): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    return typeof dateVal === 'string' ? dateVal : '';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
