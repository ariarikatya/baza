# Покерный клуб «БАЗА» — Веб-приложение и Telegram Бот

Full-stack веб-приложение для покерного клуба «БАЗА» (Next.js 14 App Router, TypeScript, Tailwind CSS, Google Sheets DB).

## Переменные окружения (.env)

Для работы приложения и встроенного Telegram-бота укажите в файле `.env` следующие переменные:

```env
# Интеграция с Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
GOOGLE_SHEET_ID="ваш_google_sheet_id"

# Интеграция с ImgBB
IMGBB_API_KEY="ваш_imgbb_api_key"
NEXT_PUBLIC_IMGBB_API_KEY="ваш_imgbb_api_key"

# Настройка Telegram Бота
TELEGRAM_BOT_TOKEN="8159179687:AAEVkVIxP_p86uHMghhF8WBb9FqdAGoeuos"
TELEGRAM_BOT_SECRET_TOKEN="ваш_произвольный_секретный_токен"

# URL приложения
NEXT_PUBLIC_APP_URL="https://ваш-домен.com"
```

---

## Настройка Webhook для Telegram Бота

Логика бота выполняется нативно в роуте `/api/telegram/webhook`. Старый Make.com вебхук больше не используется.

Чтобы зарегистрировать вебхук бота в Telegram, выполните POST-запрос к Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://ваш-домен.com/api/telegram/webhook",
       "secret_token": "ваш_произвольный_секретный_токен"
     }'
```

Или в браузере/Postman:
`POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<домен>/api/telegram/webhook`

### Проверка работоспособности бота

Запустить локальную эмуляцию всех 5 веток обработки (без отправки реальных запросов):

```bash
npx tsx scripts/test-telegram-bot.ts
```

---

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Режим разработки
npm run dev

# Сборка
npm run build
```
