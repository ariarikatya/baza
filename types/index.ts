// Types for all 23 Google Sheets tables with exact Russian column headers

// 1. Игроки
export interface PlayerRow {
  'Ник': string;
  'Пароль'?: string;
  'Имя'?: string;
  'Роль'?: 'Админ' | 'Владелец' | 'Игрок' | string;
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
  [key: string]: any;
}

// 2. ТУРНИРНАЯ ТАБЛИЦА
export interface TournamentTableRow {
  'Место'?: number | string;
  'Ник': string;
  'Имя'?: string;
  'Общий рейтинг'?: number | string;
  'Баунти'?: number | string;
  'Спец.задания'?: string;
  'Рейтинг в играх'?: number | string;
  'Статус'?: string;
  'В клубе'?: string;
  'Телеграм ID'?: string;
  '🔒 Row ID'?: string;
  [key: string]: any;
}

// 3. ЕЖЕДНЕВНЫЕ ИГРЫ
export interface DailyGameRow {
  'Дата'?: string;
  'Ник': string;
  'Место'?: number | string;
  'Игроков в день'?: number | string;
  'Банк рейтинга'?: number | string;
  'Начислено'?: number | string;
  'Сегодня сыграло'?: number | string;
  'Сезонные турниры'?: string;
  'Телеграм ID'?: string;
  'Стоимость'?: number | string;
  'Платно?'?: string;
  'Уведомление об игре'?: string;
  'Уведомление завершения'?: string;
  'Вышел?'?: string;
  'Дата окончания'?: string;
  'Описание'?: string;
  'Фишек куплено'?: number | string;
  'Вес турнира'?: number | string;
  'Всего игроков'?: number | string;
  'Номер телефона игрока'?: string;
  'Почта игрока'?: string;
  'Кубок начислен'?: string;
  'Время выхода'?: string;
  [key: string]: any;
}

// 4. Даты ежедневных игр
export interface DailyGameDateRow {
  'Дата и Время'?: string;
  'Сезонный турнир'?: string;
  'Завершено?'?: string;
  'Завершено=1'?: number | string;
  'Платно?'?: string;
  'Платно'?: string;
  'Стоимость'?: number | string;
  'Уведомления'?: string;
  'Игроков 20?'?: string;
  'Уведомления о рейтинге'?: string;
  'Описание'?: string;
  'Дата окончания регистрации'?: string;
  'Кол-во игроков'?: number | string;
  'Уведомления о турнире новом'?: string;
  'Изображение'?: string;
  '"Что будет" описание'?: string;
  [key: string]: any;
}

// 5. 💰 БАУНТИ
export interface BountyRow {
  'Дата'?: string;
  'Ник': string;
  'Тип начисления'?: string;
  'Кол-во'?: number | string;
  'Баллы'?: number | string;
  'Категория'?: string;
  'Начислено наград'?: string;
  [key: string]: any;
}

// 6. Варианты баунти
export interface BountyOptionRow {
  'Варианты баунти': string;
  [key: string]: any;
}

// 7. Задания
export interface TaskRow {
  'Дата'?: string;
  'Ник': string;
  'Описание задания'?: string;
  'Кол-во'?: number | string;
  'Баллы'?: number | string;
  'Категория'?: string;
  'Ежедневный турнир'?: string;
  [key: string]: any;
}

// 8. Варианты спецзаданий
export interface SpecialTaskOptionRow {
  'Дата турнира'?: string;
  'Описание задания'?: string;
  'Баллы'?: number | string;
  [key: string]: any;
}

// 9. Справочники
export interface ReferenceRow {
  'Место'?: number | string;
  'Баллы'?: number | string;
  'Число игроков'?: number | string;
  'Коэф'?: number | string;
  'Покупки фишек'?: number | string;
  'Коэф фишек'?: number | string;
  [key: string]: any;
}

// 10. Сезонные турниры
export interface SeasonalTournamentRow {
  'Название': string;
  'Дата начала'?: string;
  'Взнос'?: number | string;
  'Статус'?: string;
  'Описание'?: string;
  'Фото'?: string;
  'Предоплата?'?: string;
  'Уведомление'?: string;
  'Дата окончания'?: string;
  'Завершить турнир'?: string;
  'Завершено'?: string;
  'Calendar_Event_ID'?: string;
  [key: string]: any;
}

// 11. Оплачено
export interface PaidRow {
  'Ник': string;
  'Турнир'?: string;
  'Сумма'?: number | string;
  'Статус'?: string;
  'Дата и время турнира'?: string;
  [key: string]: any;
}

// 12. Администраторы
export interface AdminRow {
  'Имя': string;
  'Email'?: string;
  'Роль'?: string;
  'Фото'?: string;
  [key: string]: any;
}

// 13. Аналитика
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

// 14. В клубе
export interface InClubRow {
  'Дата'?: string;
  'Ник': string;
  'Время входа'?: string;
  'Статус'?: string;
  'Имя'?: string;
  'Email'?: string;
  'Подтвержден?'?: string;
  'Аватар'?: string;
  'ID'?: string;
  'Телеграм ID'?: string;
  'Номер телефона'?: string;
  [key: string]: any;
}

// 15. Награды
export interface RewardRow {
  'Название': string;
  'Начало'?: string;
  'За сколько начало'?: string;
  'Первое'?: string;
  'За первое'?: string;
  'За сколько первое'?: string;
  'Второе'?: string;
  'За второе'?: string;
  'За сколько второе'?: string;
  'Третье'?: string;
  'За третье'?: string;
  'За сколько третье'?: string;
  'Четвертое'?: string;
  'За четвертое'?: string;
  'За сколько четвертое'?: string;
  'Категория'?: string;
  'Описание'?: string;
  'Выбранный_Игрок_ТМП'?: string;
  [key: string]: any;
}

// 16. Награды по отдельности
export interface IndividualRewardRow {
  'Название': string;
  'Название для отображения'?: string;
  'Картинка'?: string;
  'За сколько'?: string;
  'Категория'?: string;
  'Описание'?: string;
  'Уровень'?: string;
  [key: string]: any;
}

// 17. Награды чб по отдельности
export interface IndividualRewardBWRow {
  'Название': string;
  'Название для отображения'?: string;
  'Картинка'?: string;
  'За сколько'?: string;
  'Категория'?: string;
  'Описание'?: string;
  'Уровень'?: string;
  [key: string]: any;
}

// 18. Начисление наград
export interface RewardGrantRow {
  'Ник': string;
  'Название': string;
  'Количество'?: number | string;
  'Дата и время'?: string;
  'Описание'?: string;
  'Сумма'?: number | string;
  [key: string]: any;
}

// 19. Фильтр
export interface FilterRow {
  'Фильтр': string;
  [key: string]: any;
}

// 20. Новости
export interface NewsRow {
  'Дата'?: string;
  'Заголовок': string;
  'Текст'?: string;
  'Фото'?: string;
  'Автор'?: string;
  'Уведомление'?: string;
  [key: string]: any;
}

// 21. Комментарии новостей
export interface NewsCommentRow {
  'Автор': string;
  'Комментарий': string;
  'Новость'?: string;
  'Дата и время'?: string;
  'Аватар'?: string;
  [key: string]: any;
}

// 22. Акции
export interface PromotionRow {
  'Название': string;
  'Описание'?: string;
  'Дата начала'?: string;
  'Дата окончания'?: string;
  'Уведомление'?: string;
  'Картинка'?: string;
  [key: string]: any;
}

// 23. Клуб
export interface ClubRow {
  'О клубе'?: string;
  'Логотип'?: string;
  '🔒 Row ID'?: string;
  'Анимация'?: string;
  'Файл'?: string;
  'Телефон'?: string;
  'Поддержка'?: string;
  'Приложение'?: string;
  [key: string]: any;
}

// 24. Чат
export interface ChatRow {
  'Игрок': string;
  'Сообщение': string;
  'Кому? От кого?'?: string;
  'Дата и время отправки'?: string;
  'Игрок фото'?: string;
  'Игрок почта'?: string;
  'Уникальные почты'?: string;
  'Уведомление админу'?: string;
  'Уведомление игроку'?: string;
  [key: string]: any;
}

export type RatingPeriod = 'Сегодня' | 'Месяц' | 'Сезон' | 'Год' | 'Все время';
